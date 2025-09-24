import json
import logging
import time
import uuid
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.http import JsonResponse


logger = logging.getLogger('pms.requests')


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all incoming and outgoing HTTP requests/responses
    with structured logging format including timestamps, user info, and request details.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)

    def process_request(self, request):
        """Log incoming request details"""
        request.start_time = time.time()
        request.request_id = str(uuid.uuid4())[:8]

        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(',')[0].strip()
        else:
            client_ip = request.META.get('REMOTE_ADDR', 'unknown')

        # Get request body for POST/PUT/PATCH requests
        request_body = None
        if request.method in ['POST', 'PUT', 'PATCH'] and request.content_type == 'application/json':
            try:
                request_body = json.loads(request.body.decode('utf-8'))
                # Remove sensitive data from logs
                if isinstance(request_body, dict):
                    sensitive_fields = ['password', 'token', 'secret', 'key']
                    for field in sensitive_fields:
                        if field in request_body:
                            request_body[field] = '[REDACTED]'
            except (json.JSONDecodeError, UnicodeDecodeError):
                request_body = '[BINARY_OR_INVALID_JSON]'

        # Get user info
        user_info = {
            'user_id': None,
            'username': None,
            'is_authenticated': False
        }

        if hasattr(request, 'user') and request.user.is_authenticated:
            user_info.update({
                'user_id': request.user.id,
                'username': request.user.username,
                'is_authenticated': True
            })

        log_data = {
            'event': 'request_received',
            'request_id': request.request_id,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
            'method': request.method,
            'path': request.path,
            'query_params': dict(request.GET),
            'client_ip': client_ip,
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'content_type': request.content_type,
            'user': user_info,
            'request_body': request_body
        }

        logger.info('Incoming Request', extra={'structured_data': log_data})
        return None

    def process_response(self, request, response):
        """Log outgoing response details"""
        if not hasattr(request, 'start_time'):
            return response

        duration = time.time() - request.start_time

        # Get response body for JSON responses (if not too large)
        response_body = None
        if (response.get('Content-Type', '').startswith('application/json')
            and len(response.content) < 1024 * 10):  # Log only if less than 10KB
            try:
                response_body = json.loads(response.content.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                response_body = '[INVALID_JSON]'
        elif len(response.content) >= 1024 * 10:
            response_body = '[RESPONSE_TOO_LARGE]'

        log_data = {
            'event': 'request_completed',
            'request_id': getattr(request, 'request_id', 'unknown'),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'status_text': self._get_status_text(response.status_code),
            'duration_ms': round(duration * 1000, 2),
            'response_size_bytes': len(response.content),
            'content_type': response.get('Content-Type', ''),
            'response_body': response_body
        }

        # Determine log level based on status code
        if response.status_code >= 500:
            log_level = 'error'
        elif response.status_code >= 400:
            log_level = 'warning'
        else:
            log_level = 'info'

        getattr(logger, log_level)('Request Completed', extra={'structured_data': log_data})
        return response

    def process_exception(self, request, exception):
        """Log any exceptions that occur during request processing"""
        if not hasattr(request, 'start_time'):
            return None

        duration = time.time() - request.start_time

        log_data = {
            'event': 'request_exception',
            'request_id': getattr(request, 'request_id', 'unknown'),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
            'method': request.method,
            'path': request.path,
            'duration_ms': round(duration * 1000, 2),
            'exception_type': type(exception).__name__,
            'exception_message': str(exception),
        }

        logger.error('Request Exception', extra={'structured_data': log_data})
        return None

    def _get_status_text(self, status_code):
        """Get human readable status text for status codes"""
        status_texts = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            422: 'Unprocessable Entity',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
        }
        return status_texts.get(status_code, 'Unknown')
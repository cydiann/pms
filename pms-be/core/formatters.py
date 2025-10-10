import json
import logging
from datetime import datetime


class JsonFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging.
    Outputs log records as JSON objects for easy parsing and analysis.
    """

    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcfromtimestamp(record.created).isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        # Add structured data if present (from middleware)
        if hasattr(record, 'structured_data'):
            log_entry.update(record.structured_data)

        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, 'funcName'):
            log_entry['function'] = record.funcName
        if hasattr(record, 'lineno'):
            log_entry['line'] = record.lineno
        if hasattr(record, 'pathname'):
            log_entry['file'] = record.pathname

        return json.dumps(log_entry, ensure_ascii=False)
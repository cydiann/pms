from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CoreViewSet

router = DefaultRouter()
router.register(r'', CoreViewSet, basename='core')

urlpatterns = [
    path('', include(router.urls)),
]
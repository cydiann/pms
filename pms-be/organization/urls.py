from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorksiteViewSet, DivisionViewSet

router = DefaultRouter()
router.register(r'worksites', WorksiteViewSet)
router.register(r'divisions', DivisionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
from django.db import models


class Worksite(models.Model):
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=50, default='Turkey')
    chief = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='worksite_chief')
    
    def __str__(self):
        return f"{self.city}, {self.country}"


class Division(models.Model):
    name = models.CharField(max_length=100)
    created_by = models.ForeignKey('authentication.User', on_delete=models.CASCADE)
    worksites = models.ManyToManyField(Worksite, blank=True)
    
    def __str__(self):
        return self.name

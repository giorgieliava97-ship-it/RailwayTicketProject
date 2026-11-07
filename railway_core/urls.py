"""
URL configuration for railway_core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.http import HttpResponse

def home_view(request):
    return HttpResponse("<h1>Railway Ticket API is running successfully! 🚆</h1>")

urlpatterns = [
    path('', home_view),
    path('admin/', admin.site.urls),
    path('api/users/', include('user.urls')),
    path('api/', include('tickets.urls')),
    path('api/', include('payments.urls')),
]

# Debug Toolbar-ის პათების დამატება
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
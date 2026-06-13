from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('callback/', views.AuthCallbackView.as_view(), name='auth-callback'),
    path('me/', views.MeView.as_view(), name='auth-me'),
    path("guest/", views.GuestLoginView.as_view()),
    path('top-tracks/', views.TopTracksView.as_view(), name='auth-top-tracks'),
    path('top-items/', views.TopItemsView.as_view(), name='auth-top-items'),
    path('refresh/', views.RefreshTokenView.as_view(), name='auth-refresh'),
    path('logout/', views.LogoutView.as_view(), name='auth-logout'),
    path("top-items/",views.TopItemsView.as_view()),
    path("playlists/<str:playlist_id>/",views.PlaylistView.as_view()),
    path("saved-tracks/",views.SavedTracksView.as_view()),
    path("recommendations/",views.RecommendationsView.as_view()),
    path("resume-playback/",views.ResumePlaybackView.as_view()),
    path("recently-played/",views.RecentlyPlayedView.as_view())

]

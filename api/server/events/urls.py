from django.urls import path
from events import views

urlpatterns = [
    path("", views.EventListCreateView.as_view(), name="event-list-create"),
    path("<int:pk>/", views.EventDetailView.as_view(), name="event-detail"),
    path("<int:pk>/publish/", views.EventPublishView.as_view(), name="event-publish"),
    path("<int:pk>/schedule-publication/", views.EventSchedulePublicationView.as_view(), name="event-schedule-publication"),
    path("<int:pk>/archive/", views.EventArchiveView.as_view(), name="event-archive"),
    path("<int:pk>/cancel/", views.EventCancelView.as_view(), name="event-cancel"),
    path("<int:pk>/complete/", views.EventCompleteView.as_view(), name="event-complete"),

    path("<int:event_id>/interests/", views.EventInterestCreateView.as_view(), name="event-interest-create"),
    path("<int:event_id>/interests/me/", views.MyEventInterestDeleteView.as_view(), name="event-interest-delete-me"),

    path("<int:event_id>/files/", views.EventFileListCreateView.as_view(), name="event-file-list-create"),
    path(
        "<int:event_id>/files/<int:file_id>/",
        views.EventFileDetailView.as_view(),
        name="event-file-detail",
    ),

    path("<int:event_id>/comments/", views.EventCommentListCreateView.as_view(), name="event-comment-list-create"),
    path("<int:event_id>/comments/<int:comment_id>/", views.EventCommentDetailView.as_view(), name="event-comment-detail"),

    path("<int:event_id>/posts/", views.EventPostListCreateView.as_view(), name="event-post-list-create"),
    path("<int:event_id>/posts/<int:post_id>/", views.EventPostDetailView.as_view(), name="event-post-detail"),
    path("<int:event_id>/posts/<int:post_id>/publish/", views.EventPostPublishView.as_view(), name="event-post-publish"),
    path("<int:event_id>/posts/<int:post_id>/schedule-publication/", views.EventPostSchedulePublicationView.as_view(), name="event-post-schedule-publication"),
]
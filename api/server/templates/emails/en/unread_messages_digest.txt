Hi {{ recipient.first_name }},

You have {{ messages|length }} unread message(s) on the platform.

{% for item in messages %}
- {{ item.sender_name }}: {{ item.preview }}
  {{ item.conversation_url }}
{% endfor %}

Open messages: {{ messages_url }}

Best,
StudioOS — Dance School

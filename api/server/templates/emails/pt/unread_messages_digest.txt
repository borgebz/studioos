Olá {{ recipient.first_name }},

Tem {{ messages|length }} mensagem(ns) por ler na plataforma.

{% for item in messages %}
- {{ item.sender_name }}: {{ item.preview }}
  {{ item.conversation_url }}
{% endfor %}

Abrir mensagens: {{ messages_url }}

Cumprimentos,
StudioOS — Escola de Dança

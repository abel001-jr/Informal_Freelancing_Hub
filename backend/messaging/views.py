from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q, Max
from .models import Message
from accounts.models import User
from notifications.utils import create_notification


@login_required
def inbox(request):
    user = request.user
    # Get unique conversations
    sent = Message.objects.filter(sender=user).values_list('receiver', flat=True)
    received = Message.objects.filter(receiver=user).values_list('sender', flat=True)
    contact_ids = set(list(sent) + list(received))
    contacts = User.objects.filter(id__in=contact_ids)

    conversations = []
    for contact in contacts:
        last_msg = Message.objects.filter(
            Q(sender=user, receiver=contact) | Q(sender=contact, receiver=user)
        ).last()
        unread = Message.objects.filter(sender=contact, receiver=user, is_read=False).count()
        conversations.append({'contact': contact, 'last_message': last_msg, 'unread': unread})

    conversations.sort(key=lambda x: x['last_message'].created_at if x['last_message'] else '', reverse=True)

    return render(request, 'messaging/inbox.html', {'conversations': conversations})


@login_required
def conversation(request, user_id):
    other_user = get_object_or_404(User, pk=user_id)
    user = request.user

    # Ensure users can only message clients/freelancers they have a project with
    # or directly contact
    msgs = Message.objects.filter(
        Q(sender=user, receiver=other_user) | Q(sender=other_user, receiver=user)
    ).order_by('created_at')

    # Mark messages as read
    msgs.filter(receiver=user, is_read=False).update(is_read=True)

    if request.method == 'POST':
        content = request.POST.get('message', '').strip()
        if content:
            msg = Message.objects.create(
                sender=user,
                receiver=other_user,
                message=content,
            )
            if request.FILES.get('attachment'):
                msg.attachment = request.FILES['attachment']
                msg.save()
            create_notification(other_user, 'New Message', f'You have a new message from {user.get_full_name()}.', 'message')
            return redirect('messaging:conversation', user_id=user_id)

    return render(request, 'messaging/conversation.html', {
        'other_user': other_user,
        'messages_list': msgs,
    })


@login_required
def send_message(request, user_id):
    """Quick message from profile/service page"""
    other_user = get_object_or_404(User, pk=user_id)
    return redirect('messaging:conversation', user_id=user_id)

import { MessageCircle } from '@/components/icons';

export default function MessagesPage() {
  return (
    <div className='messages-placeholder'>
      <MessageCircle size={36} className='text-plum-700' />
      <h2>Select a conversation</h2>
      <p>Your chats with laptop buyers and sellers will appear here.</p>
    </div>
  );
}

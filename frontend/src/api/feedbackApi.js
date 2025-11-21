import { API_URL } from '../constants/config';

export async function submitFeedback({ token, email, type, rating, message }) {
  const response = await fetch(`${API_URL}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ email, type, rating, message }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error || 'Failed to submit feedback';
    throw new Error(errorMessage);
  }
  return data.feedback;
}



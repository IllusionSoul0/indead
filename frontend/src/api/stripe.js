export async function payApplication(applicationId, amount, card, stripe) {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/payments/intent`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId, amount }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error);
  }

  const result = await stripe.confirmCardPayment(data.clientSecret, {
    payment_method: { card },
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

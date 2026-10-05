import os
import smtplib
from email.message import EmailMessage


SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USERNAME)
SMTP_TLS = os.getenv("SMTP_TLS", "true").lower() == "true"


def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP through configured SMTP. In local development without SMTP, print OTP."""
    if not all([SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM]):
        print(f"[DEVELOPMENT OTP] {to_email} -> {otp}")
        return False

    msg = EmailMessage()
    msg["Subject"] = "Examinate password reset OTP"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        f"Your Examinate password reset OTP is {otp}.\n\n"
        "This OTP expires in 10 minutes. If you did not request this, ignore this email."
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_TLS:
            server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
    return True

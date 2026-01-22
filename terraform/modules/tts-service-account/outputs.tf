output "service_account_email" {
  description = "Email of the TTS service account"
  value       = google_service_account.tts.email
}

output "service_account_id" {
  description = "ID of the TTS service account"
  value       = google_service_account.tts.id
}

output "tts_service_account_email" {
  description = "Email of the TTS production service account"
  value       = module.tts_service_account.service_account_email
}

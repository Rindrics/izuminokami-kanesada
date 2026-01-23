output "tts_service_account_email" {
  description = "Email of the TTS dev service account"
  value       = module.tts_service_account.service_account_email
}

output "audio_storage_bucket" {
  description = "Name of the audio storage bucket"
  value       = module.audio_storage.bucket_name
}

output "audio_storage_url" {
  description = "Public URL prefix for audio files"
  value       = module.audio_storage.public_url_prefix
}

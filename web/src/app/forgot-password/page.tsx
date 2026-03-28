import type { Metadata } from 'next'
import ForgotPassword from '../../views/ForgotPassword'

export const metadata: Metadata = { title: 'Forgot Password' }

export default function ForgotPasswordPage() {
  return <ForgotPassword />
}

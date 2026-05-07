import {
  passwordResetFailureUserMessage,
  profileUpdateFailureUserMessage,
  signInFailureUserMessage,
  signUpFailureUserMessage,
} from '@/lib/authUiMessages'

describe('signInFailureUserMessage', () => {
  it('returns generic message', () => {
    expect(signInFailureUserMessage(new Error('anything'))).toBe(
      'Incorrect username or password.',
    )
  })
})

describe('signUpFailureUserMessage', () => {
  it('maps duplicate username errors', () => {
    expect(signUpFailureUserMessage(new Error('User already exists'))).toBe(
      'That username is already taken. Try another.',
    )
  })

  it('maps password length errors', () => {
    expect(signUpFailureUserMessage(new Error('password too short'))).toBe(
      'Password does not meet requirements (at least 8 characters).',
    )
  })

  it('falls back to generic message', () => {
    expect(signUpFailureUserMessage(new Error('unknown'))).toBe(
      'Could not create account. Please check your details and try again.',
    )
  })
})

describe('profileUpdateFailureUserMessage', () => {
  it('maps wrong current password', () => {
    expect(profileUpdateFailureUserMessage(new Error('InvalidSecret'))).toBe(
      'Current password is incorrect.',
    )
  })

  it('maps not signed in', () => {
    expect(profileUpdateFailureUserMessage(new Error('Not signed in'))).toBe(
      'You are not signed in. Please sign in again.',
    )
  })
})

describe('passwordResetFailureUserMessage', () => {
  it('maps captcha failures', () => {
    expect(passwordResetFailureUserMessage(new Error('captcha failed'))).toBe(
      'Captcha verification failed. Please try again.',
    )
  })

  it('falls back to generic message', () => {
    expect(passwordResetFailureUserMessage(new Error('other'))).toBe(
      'Could not reset password. Please try again.',
    )
  })
})

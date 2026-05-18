export interface ProfileData {
  username: string
  lastName: string
  firstName: string
  email: string
  telNo: string
  teamId: string
  rank: string
}

export type ProfileUpdatePayload = Omit<ProfileData, 'username' | 'email'>

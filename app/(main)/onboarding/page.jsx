import React from 'react'
import { industries } from '@/data/industries'
import { getUserOnboardingStatus } from '@/actions/user';
import OnboardingPage from './_components/onboarding-form';
import { redirect } from 'next/navigation';
const Onboardingpage = async() => {
    const { isOnboarded } = await getUserOnboardingStatus();

  if (isOnboarded) {
    redirect("/dashboard");
  }

  
  return (
    <main>
        <OnboardingPage industries={industries} />
        </main>
  )
}

export default Onboardingpage

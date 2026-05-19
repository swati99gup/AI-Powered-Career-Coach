import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/actions/user";
import { getDashboardData } from "@/actions/dashboard";
import DashboardView from "./_components/dashboard-view";

const IndustryInsightPage = async () => {
  const { isOnboarded } = await getUserOnboardingStatus();
const insights=await getDashboardData();
  if (!isOnboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="contain mx-auto">
      <DashboardView insights={insights} />
    </div>
  );
};

export default IndustryInsightPage;
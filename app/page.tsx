import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ROICalculator from "@/components/ROICalculator";
import HowItWorks from "@/components/HowItWorks";
import WhatsAppDemo from "@/components/WhatsAppDemo";
import DashboardPreview from "@/components/DashboardPreview";
import Countdown from "@/components/Countdown";
import PreLaunchOffer from "@/components/PreLaunchOffer";
import WaitlistForm from "@/components/WaitlistForm";
import SocialProof from "@/components/SocialProof";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ROICalculator />
        <HowItWorks />
        <WhatsAppDemo />
        <DashboardPreview />
        <Countdown />
        <PreLaunchOffer />
        <WaitlistForm />
        <SocialProof />
      </main>
      <Footer />
    </>
  );
}

// import AnnouncementBar from "../../components/header/AnnouncementBar/AnnouncementBar";
import MainHeader from "../../components/header/MainHeader/MainHeader";
// import Navigation from "../../components/header/Navigation/Navigation";

import HeroBanner from "../../components/homepage/HeroBanner/HeroBanner";
import TrustFeatures from "../../components/homepage/TrustFeatures/TrustFeatures";
import ShopByCategory from "../../components/homepage/ShopByCategory/ShopByCategory";
import PromoBanner from "../../components/homepage/PromoBanner/PromoBanner";
import Bestsellers from "../../components/homepage/Bestsellers/Bestsellers";
import BrandShowcase from "../../components/homepage/BrandShowcase/BrandShowcase";
import ContactUsPage from "../../components/homepage/Newsletter/ContactUsPage";
import Offers from "../../components/homepage/DealsOfTheDay/Offers";
// import ShopByRange from "../../components/homepage/ShopByRange/ShopByRange";
import NewArrivals from "../../components/homepage/NewArrivals/NewArrivals";
import Footer from "../../components/footer/Footer";

import styles from "./HomePage.module.css";

function HomePage() {
  return (
    <div className={styles.page}>
      <header>
        {/* <AnnouncementBar /> */}
        <MainHeader />
        
        {/* <Navigation /> */}
      </header>

      <main>
        <HeroBanner />
        <TrustFeatures />
        <ShopByCategory />
        <Offers />
        <PromoBanner />
        <NewArrivals />
        <Bestsellers />
        <BrandShowcase />
        {/* <ShopByRange /> */}
        <ContactUsPage />
      </main>

      <Footer />
    </div>
  );
}

export default HomePage;
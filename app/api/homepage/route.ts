import { getHomepage } from "@/lib/homepage/repository";

export async function GET() {
  try {
    const homepage = await getHomepage();
    
    // Return only the navigation part of the homepage data
    return Response.json({
      navigation: homepage.navigation,
      categories: homepage.categories
    });
  } catch (error) {
    console.error("Error fetching homepage data:", error);
    
    // Return default navigation as fallback
    return Response.json({
      navigation: [
        { label: "Shop", href: "/shop" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "FAQ", href: "/faq" },
      ],
      categories: []
    });
  }
}
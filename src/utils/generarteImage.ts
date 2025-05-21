import axios from "axios";

type GeneratedBanners = {
  BannerDesktop: string;
  BannerImageIpad: string;
  BannerImageMobile: string;
  phoneCompatibilityImage: string;
  coverageSubtitleImage: string;
};

export const generateAllBanners = async (
  brandName: string,
  brandCategory: string
): Promise<GeneratedBanners> => {
  try {
    type BannerResponse = {
      banner?: {
        variations?: Array<{
          banners?: {
            desktop?: { url?: string };
            ipad?: { url?: string };
            mobile?: { url?: string };
          };
        }>;
      };
    };

    type BannersResponse = {
      banner: {
        variations: {
          variation: number;
          banner: {
            id: string;
            url: string;
            format: string;
            name: string;
          };
        }[];
      };
    };

    const payload = {
      brand_name:brandName,
      domain:brandCategory,
    };

    const [bannerRes, byopRes, networkRes] = await Promise.all([
      axios.post<BannerResponse>(
        "https://utkarsh134-logogeneration.hf.space/generate-banner",
        payload
      ),
      axios.post<BannersResponse>(
        "https://utkarsh134-logogeneration.hf.space/generate-byop-banner",
        payload
      ),
      axios.post<BannersResponse>(
        "https://utkarsh134-logogeneration.hf.space/generate-network-banner",
        payload
      ),
    ]);

    const bannerVariation = bannerRes.data?.banner?.variations?.[0]?.banners;
    const byopVariation = byopRes.data?.banner?.variations?.[0]?.banner;
    const networkVariation = networkRes.data?.banner?.variations?.[0]?.banner;

    return {
      BannerDesktop: bannerVariation?.desktop?.url || "",
      BannerImageIpad: bannerVariation?.ipad?.url || "",
      BannerImageMobile: bannerVariation?.mobile?.url || "",
      phoneCompatibilityImage: byopVariation?.url || "",
      coverageSubtitleImage: networkVariation?.url || "",
    };
  } catch (error) {
    console.error("Error generating banner images:", error);
    throw new Error("Failed to generate one or more banner images.");
  }
};

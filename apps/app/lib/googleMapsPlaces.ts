export type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  longText?: string;
  shortText?: string;
  types?: string[];
};

export type GoogleAddressSuggestion = {
  id: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  placePrediction: any;
};

declare global {
  interface Window {
    google?: any;
    __grenbeeGoogleMapsLoader?: Promise<void>;
    __grenbeeGoogleMapsApiKey?: string;
    __grenbeeGoogleMapsInit?: () => void;
  }
}

function hasPlacesLibrary() {
  return Boolean(window.google?.maps?.places);
}

export function isUsableGoogleMapsKey(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.startsWith("AIza") && !trimmed.includes("REPLACE_ME");
}

export async function loadGooglePlacesLibrary(apiKey: string): Promise<any> {
  if (!isUsableGoogleMapsKey(apiKey)) {
    throw new Error("Google Maps API key is missing or invalid.");
  }

  if (hasPlacesLibrary() && window.__grenbeeGoogleMapsApiKey === apiKey) {
    return window.google.maps.places;
  }

  if (!window.__grenbeeGoogleMapsLoader || window.__grenbeeGoogleMapsApiKey !== apiKey) {
    window.__grenbeeGoogleMapsApiKey = apiKey;
    window.__grenbeeGoogleMapsLoader = new Promise<void>((resolve, reject) => {
      document.querySelector('script[data-grenbee-google-maps="true"]')?.remove();
      document.querySelector('script[data-gb-maps="true"]')?.remove();

      window.__grenbeeGoogleMapsInit = () => resolve();

      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: apiKey,
        libraries: "places",
        v: "weekly",
        loading: "async",
        callback: "__grenbeeGoogleMapsInit",
      });

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.dataset.grenbeeGoogleMaps = "true";
      script.onerror = () => reject(new Error("Google Maps script could not be loaded."));
      document.head.appendChild(script);
    });
  }

  await window.__grenbeeGoogleMapsLoader;

  if (window.google?.maps?.importLibrary) {
    await window.google.maps.importLibrary("places");
  }

  if (!hasPlacesLibrary()) {
    throw new Error("Google Places library is unavailable.");
  }

  return window.google.maps.places;
}

export function createGoogleAutocompleteSessionToken(): any {
  const Token = window.google?.maps?.places?.AutocompleteSessionToken;
  return Token ? new Token() : undefined;
}

export async function fetchGoogleAddressSuggestions(
  apiKey: string,
  input: string,
  sessionToken?: any,
): Promise<GoogleAddressSuggestion[]> {
  const places = await loadGooglePlacesLibrary(apiKey);
  if (!places.AutocompleteSuggestion || input.trim().length < 3) {
    return [];
  }

  const response = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: input.trim(),
    includedRegionCodes: ["us"],
    sessionToken,
  });

  return (response?.suggestions || [])
    .map((suggestion: any, index: number) => {
      const prediction = suggestion.placePrediction;
      if (!prediction) return null;
      const mainText = prediction.mainText?.text || prediction.text?.text || "";
      const secondaryText = prediction.secondaryText?.text || "";
      const fullText = prediction.text?.text || [mainText, secondaryText].filter(Boolean).join(", ");
      return {
        id: prediction.placeId || `${fullText}-${index}`,
        mainText,
        secondaryText,
        fullText,
        placePrediction: prediction,
      };
    })
    .filter(Boolean) as GoogleAddressSuggestion[];
}

export async function resolveGoogleAddressSuggestion(suggestion: GoogleAddressSuggestion): Promise<{
  formattedAddress: string;
  addressComponents: GoogleAddressComponent[];
}> {
  const place = suggestion.placePrediction.toPlace();
  await place.fetchFields({ fields: ["formattedAddress", "addressComponents"] });
  return {
    formattedAddress: place.formattedAddress || suggestion.fullText,
    addressComponents: place.addressComponents || [],
  };
}

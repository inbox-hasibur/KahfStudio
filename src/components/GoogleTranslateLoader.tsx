"use client";

import { useEffect } from "react";

export default function GoogleTranslateLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Define the global initializer function
    (window as any).googleTranslateElementInit = function () {
      if ((window as any).google?.translate?.TranslateElement) {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: "bn", autoDisplay: false },
          "google_translate_element"
        );
      }
    };

    // Dynamically inject the Google Translate script AFTER hydration complete
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.type = "text/javascript";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  return <div id="google_translate_element" className="hidden" suppressHydrationWarning />;
}

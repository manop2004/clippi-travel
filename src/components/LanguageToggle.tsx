import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "ja" ? "en" : "ja";
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-white border shadow-2xs hover:bg-stone-50 transition text-xs font-black"
      style={{ borderColor: "#EFE5DD" }}
      aria-label="Switch language"
    >
      {i18n.language === "ja" ? "EN" : "JP"}
    </button>
  );
}

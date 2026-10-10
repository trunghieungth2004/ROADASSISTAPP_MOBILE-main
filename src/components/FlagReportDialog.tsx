import HazardReportWizard from "./HazardReportWizard";
import type {FlagReport} from "./FlagSheet";
import type {Strings} from "../i18n/en";
import {useStrings} from "../context/LanguageContext";

type Props = {
  t: Strings;
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmit: (report: FlagReport) => Promise<void> | void;
  onViewOnMap?: (lat: number, lng: number) => void;
};

export default function FlagReportDialog({t, lat, lng, onClose, onSubmit, onViewOnMap}: Props) {
  const {lang} = useStrings();
  return (
    <HazardReportWizard
      t={t}
      lang={lang}
      lat={lat}
      lng={lng}
      onClose={onClose}
      onSubmit={onSubmit}
      onViewOnMap={onViewOnMap}
    />
  );
}

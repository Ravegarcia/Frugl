import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBell,
  faBan,
  faCheckCircle,
  faCircleCheck,
  faCircleExclamation,
  faEye,
  faEyeSlash,
  faExternalLinkAlt,
  faFlag,
  faHouse,
  faLaptop,
  faMagnifyingGlass,
  faMessage,
  faPen,
  faPlusCircle,
  faShield,
  faShieldHalved,
  faShieldHeart,
  faStar,
  faTag,
  faTriangleExclamation,
  faUpload,
  faUser,
  faUsers,
  faWandMagicSparkles,
  faXmark,
  faCamera,
  faArrowsRotate,
  faPaperPlane,
  faCircleNotch,
} from '@fortawesome/free-solid-svg-icons';

type Props = {
  size?: number;
  className?: string;
};

function icon(definition: IconDefinition) {
  return function AppIcon({ size = 20, className }: Props) {
    return (
      <FontAwesomeIcon
        icon={definition}
        className={className}
        style={{ width: size, height: size }}
        aria-hidden='true'
      />
    );
  };
}

export const AlertCircle = icon(faCircleExclamation);
export const AlertTriangle = icon(faTriangleExclamation);
export const ArrowsRotate = icon(faArrowsRotate);
export const BadgeCheck = icon(faCircleCheck);
export const Ban = icon(faBan);
export const Bell = icon(faBell);
export const Camera = icon(faCamera);
export const CheckCircle = icon(faCircleCheck);
export const CheckCircle2 = icon(faCheckCircle);
export const Edit3 = icon(faPen);
export const Eye = icon(faEye);
export const EyeOff = icon(faEyeSlash);
export const ExternalLink = icon(faExternalLinkAlt);
export const Flag = icon(faFlag);
export const Home = icon(faHouse);
export const Laptop = icon(faLaptop);
export const Loader2 = icon(faCircleNotch);
export const MessageCircle = icon(faMessage);
export const PlusCircle = icon(faPlusCircle);
export const RefreshCw = ArrowsRotate;
export const Search = icon(faMagnifyingGlass);
export const Send = icon(faPaperPlane);
export const Shield = icon(faShield);
export const ShieldAlert = icon(faTriangleExclamation);
export const ShieldCheck = icon(faShieldHalved);
export const ShieldHeart = icon(faShieldHeart);
export const Sparkles = icon(faWandMagicSparkles);
export const Star = icon(faStar);
export const Tag = icon(faTag);
export const UploadCloud = icon(faUpload);
export const User = icon(faUser);
export const Users = icon(faUsers);
export const X = icon(faXmark);

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBell as faBellRegular,
  faBookmark as faBookmarkRegular,
  faCircleCheck as faCircleCheckRegular,
  faEye as faEyeRegular,
  faEyeSlash as faEyeSlashRegular,
  faFlag as faFlagRegular,
  faMessage as faMessageRegular,
  faPaperPlane as faPaperPlaneRegular,
  faPenToSquare as faPenToSquareRegular,
  faStar as faStarRegular,
  faUser as faUserRegular,
} from '@fortawesome/free-regular-svg-icons';
import {
  faBan,
  faBell,
  faBookmark,
  faCamera,
  faChevronDown,
  faCircleCheck,
  faCircleExclamation,
  faCircleNotch,
  faCloudArrowUp,
  faExternalLinkAlt,
  faEye,
  faEyeSlash,
  faFlag,
  faGear,
  faHouse,
  faLaptop,
  faMagnifyingGlass,
  faMessage,
  faPaperPlane,
  faPenToSquare,
  faPlusCircle,
  faRightFromBracket,
  faShield,
  faShieldHalved,
  faShieldHeart,
  faSpinner,
  faStar,
  faTag,
  faTriangleExclamation,
  faUser,
  faUsers,
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

type IconVariant = 'regular' | 'solid';

type Props = {
  size?: number;
  className?: string;
  variant?: IconVariant;
  hoverVariant?: IconVariant;
};

function icon(
  solid: IconDefinition,
  regular: IconDefinition = solid,
  defaultVariant: IconVariant = 'solid'
) {
  return function AppIcon({ size = 20, className, variant = defaultVariant, hoverVariant }: Props) {
    const iconClassName = className ? `${className} ` : '';
    const renderIcon = (iconVariant: IconVariant, stateClass: string) => (
      <FontAwesomeIcon
        icon={iconVariant === 'regular' ? regular : solid}
        className={`${iconClassName}${stateClass}`}
        style={{ width: size, height: size }}
        aria-hidden='true'
      />
    );

    if (hoverVariant) {
      return (
        <>
          {renderIcon(variant, 'icon-hover-default')}
          {renderIcon(hoverVariant, 'icon-hover-active')}
        </>
      );
    }

    return (
      <FontAwesomeIcon
        icon={variant === 'regular' ? regular : solid}
        className={className}
        style={{ width: size, height: size }}
        aria-hidden='true'
      />
    );
  };
}

export const AlertCircle = icon(faCircleExclamation);
export const AlertTriangle = icon(faTriangleExclamation);
export const ArrowsRotate = icon(faCircleNotch);
export const BadgeCheck = icon(faCircleCheck, faCircleCheckRegular);
export const Ban = icon(faBan);
export const Bell = icon(faBell, faBellRegular, 'regular');
export const Bookmark = icon(faBookmark, faBookmarkRegular, 'regular');
export const Camera = icon(faCamera);
export const CheckCircle = icon(faCircleCheck, faCircleCheckRegular, 'regular');
export const CheckCircle2 = CheckCircle;
export const ChevronDown = icon(faChevronDown);
export const Edit3 = icon(faPenToSquare, faPenToSquareRegular, 'regular');
export const Eye = icon(faEye, faEyeRegular, 'regular');
export const EyeOff = icon(faEyeSlash, faEyeSlashRegular, 'regular');
export const ExternalLink = icon(faExternalLinkAlt);
export const Flag = icon(faFlag, faFlagRegular, 'regular');
export const Gear = icon(faGear);
export const Home = icon(faHouse);
export const Laptop = icon(faLaptop);
export const Loader2 = icon(faSpinner);
export const MessageCircle = icon(faMessage, faMessageRegular, 'regular');
export const PlusCircle = icon(faPlusCircle);
export const RefreshCw = icon(faCircleNotch);
export const Search = icon(faMagnifyingGlass);
export const SignOut = icon(faRightFromBracket);
export const Send = icon(faPaperPlane, faPaperPlaneRegular, 'regular');
export const Shield = icon(faShield);
export const ShieldAlert = icon(faTriangleExclamation);
export const ShieldCheck = icon(faShieldHalved);
export const ShieldHeart = icon(faShieldHeart);
export const Sparkles = icon(faWandMagicSparkles);
export const Star = icon(faStar, faStarRegular, 'regular');
export const Tag = icon(faTag);
export const UploadCloud = icon(faCloudArrowUp);
export const User = icon(faUser, faUserRegular, 'regular');
export const Users = icon(faUsers);
export const X = icon(faXmark);

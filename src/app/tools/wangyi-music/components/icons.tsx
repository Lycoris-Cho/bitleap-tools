interface IconProps {
    className?: string
}

const STROKE = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
}

export function IconSearch({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20.5 20.5-4-4" />
        </svg>
    )
}

export function IconPlay({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1L8.92 4.7A.6.6 0 0 0 8 5.2Z" />
        </svg>
    )
}

export function IconPause({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
            <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
        </svg>
    )
}

export function IconPrev({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="5" y="5.5" width="2.4" height="13" rx="1.1" />
            <path d="M19 6.6v10.8a.6.6 0 0 1-.93.5l-8.2-5.4a.6.6 0 0 1 0-1l8.2-5.4a.6.6 0 0 1 .93.5Z" />
        </svg>
    )
}

export function IconNext({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5 6.6v10.8a.6.6 0 0 0 .93.5l8.2-5.4a.6.6 0 0 0 0-1l-8.2-5.4a.6.6 0 0 0-.93.5Z" />
            <rect x="16.6" y="5.5" width="2.4" height="13" rx="1.1" />
        </svg>
    )
}

export function IconVolume({ className, level = 2 }: IconProps & { level?: 0 | 1 | 2 }) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M11 5.5 6.8 9H4.2a.7.7 0 0 0-.7.7v4.6a.7.7 0 0 0 .7.7h2.6L11 18.5a.5.5 0 0 0 .8-.4V5.9a.5.5 0 0 0-.8-.4Z" />
            {level >= 1 && <path d="M15 9.5a3.6 3.6 0 0 1 0 5" />}
            {level >= 2 && <path d="M17.8 7a7.2 7.2 0 0 1 0 10" />}
        </svg>
    )
}

export function IconMute({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M11 5.5 6.8 9H4.2a.7.7 0 0 0-.7.7v4.6a.7.7 0 0 0 .7.7h2.6L11 18.5a.5.5 0 0 0 .8-.4V5.9a.5.5 0 0 0-.8-.4Z" />
            <path d="m16 9.5 5 5M21 9.5l-5 5" />
        </svg>
    )
}

export function IconRepeat({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="m17 2.5 3.5 3.5L17 9.5" />
            <path d="M3.5 11.5V11a4.5 4.5 0 0 1 4.5-4.5h12" />
            <path d="M7 21.5 3.5 18 7 14.5" />
            <path d="M20.5 12.5v.5a4.5 4.5 0 0 1-4.5 4.5H4" />
        </svg>
    )
}

export function IconRepeatOne({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="m17 2.5 3.5 3.5L17 9.5" />
            <path d="M3.5 11.5V11a4.5 4.5 0 0 1 4.5-4.5h12" />
            <path d="M7 21.5 3.5 18 7 14.5" />
            <path d="M20.5 12.5v.5a4.5 4.5 0 0 1-4.5 4.5H4" />
            <path d="M11.6 10.4 13 9.6v4.8" />
        </svg>
    )
}

export function IconShuffle({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M16.5 3.5 21 8l-4.5 4.5" />
            <path d="M21 8h-4.2c-1.6 0-3.1.8-4 2.1L9.7 14.4A4.8 4.8 0 0 1 5.7 17H3" />
            <path d="M16.5 12.5 21 17l-4.5 4.5" />
            <path d="M3 7h2.7c1.6 0 3.1.8 4 2.1l.6.9" />
            <path d="M21 17h-4.2a4.8 4.8 0 0 1-4-2.1l-.5-.8" />
        </svg>
    )
}

export function IconList({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M4 6.5h10M4 12h10M4 17.5h6" />
            <circle cx="17.5" cy="16" r="2.8" />
            <path d="M20.3 16V8.4l-4.2 1" />
        </svg>
    )
}

export function IconClose({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    )
}

export function IconTrash({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M4 6.5h16" />
            <path d="M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.7" />
            <path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" />
            <path d="M10.5 10.5v6M13.5 10.5v6" />
        </svg>
    )
}

export function IconLink({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M10.2 13.8a4.6 4.6 0 0 0 6.5 0l2.6-2.6a4.6 4.6 0 0 0-6.5-6.5l-1 1" />
            <path d="M13.8 10.2a4.6 4.6 0 0 0-6.5 0l-2.6 2.6a4.6 4.6 0 0 0 6.5 6.5l1-1" />
        </svg>
    )
}

export function IconExternal({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M14 4.5h5.5V10" />
            <path d="M19.5 4.5 11 13" />
            <path d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" />
        </svg>
    )
}

export function IconSparkles({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="m12 3.5 1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z" />
            <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
        </svg>
    )
}

export function IconMusic({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M9 18.5V6.2l11-2.2v12.3" />
            <circle cx="6.3" cy="18.5" r="2.8" />
            <circle cx="17.3" cy="16.3" r="2.8" />
        </svg>
    )
}

export function IconDisc({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 3v5.8M12 15.2V21M3 12h5.8M15.2 12H21" />
        </svg>
    )
}

export function IconSpinner({ className }: IconProps) {
    return (
        <svg className={`animate-spin ${className ?? ''}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.25" />
            <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
    )
}

export function IconCheck({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="m5 13 4.5 4.5L19 7" />
        </svg>
    )
}

export function IconRetry({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <path d="M20.5 12a8.5 8.5 0 1 1-2.8-6.3" />
            <path d="M20.5 4v5.2h-5.2" />
        </svg>
    )
}

export function IconAlert({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" {...STROKE} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.8v5M12 16.2h.01" />
        </svg>
    )
}

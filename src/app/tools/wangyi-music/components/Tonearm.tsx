interface TonearmProps {
    /** 播放时唱臂落下贴住唱片，暂停时抬起到右上角 */
    playing: boolean
}

/**
 * 唱臂（仿网易云播放页）：
 * 旋转中心固定在右上角支点，整条臂靠一个 transform 切换落针/抬臂。
 * 落针时唱头落在唱片最外圈，抬臂时只摆到唱片右缘外侧的空白处，
 * 不能压到右侧歌词列（抬臂角度必须够小）。
 */
const ARM_DOWN = 'rotate(0deg)'
const ARM_UP = 'rotate(-9deg)'

export default function Tonearm({ playing }: TonearmProps) {
    return (
        <div
            className="pointer-events-none absolute -top-[10%] right-[-4%] z-20 h-[76%] w-[35%]"
            style={{
                transformOrigin: '66.5% 8%',
                transform: playing ? ARM_DOWN : ARM_UP,
                transition: 'transform .9s cubic-bezier(.33,.9,.24,1)',
            }}
            aria-hidden="true"
        >
            {/* 配重 */}
            <div className="absolute right-[1%] top-[2.5%] h-[7.5%] w-[31%] rounded-full bg-gradient-to-b from-[#d6d6e0] to-[#6e6e7a] shadow-[0_2px_6px_rgba(0,0,0,.5)]" />
            {/* 支点 */}
            <div className="absolute right-[26%] top-[2%] h-[11%] w-[14%] rounded-full bg-gradient-to-b from-[#e2e2ea] to-[#797986] shadow-[0_3px_10px_rgba(0,0,0,.55)] ring-1 ring-black/20" />
            {/* 臂杆 */}
            <div className="absolute right-[30.5%] top-[6.5%] h-[78%] w-[5%] rounded-full bg-gradient-to-b from-[#dcdce6] via-[#9d9dab] to-[#6a6a76] shadow-[0_2px_8px_rgba(0,0,0,.45)]" />
            {/* 唱头 */}
            <div className="absolute bottom-[4%] right-[23%] h-[11%] w-[18%] -rotate-[14deg] rounded-[4px] bg-[#242430] shadow-[0_5px_14px_rgba(0,0,0,.65)] ring-1 ring-white/20">
                <div className="absolute inset-x-[14%] bottom-[16%] h-[26%] rounded-[2px] bg-gradient-to-b from-[#cfcfda] to-[#7d7d8a]" />
            </div>
        </div>
    )
}

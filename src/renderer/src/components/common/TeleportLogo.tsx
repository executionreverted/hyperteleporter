import React from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'
import TeleportLogoData from '../../assets/Teleport Logo Solid White NoBg.json'

interface TeleportLogoProps {
    size?: number
    containerSize?: string
    loop?: boolean
    autoplay?: boolean
    className?: string
    onComplete?: () => void
    fill?: boolean // make logo take full width of container
    pingPong?: boolean // alternate forward/backward looping
}

export function TeleportLogo({ size = 48, loop = true, containerSize = "50%", autoplay = true, className, onComplete, fill = false, pingPong = false }: TeleportLogoProps) {
    const animationData = TeleportLogoData as unknown as Record<string, unknown>
    const lottieRef = React.useRef<LottieRefCurrentProps | null>(null)
    const [direction, setDirection] = React.useState<1 | -1>(1)

    // Ensure initial direction is forward
    React.useEffect(() => {
        const inst = lottieRef.current
        if (!inst) return
        try {
            inst.setDirection(1)
        } catch { }
    }, [])

    return (
        <div className={className} style={{ lineHeight: 0, width: containerSize }}>
            <Lottie
                lottieRef={lottieRef}
                animationData={animationData}
                loop={pingPong ? false : loop}
                autoplay={autoplay}
                style={{ width: fill ? '100%' : size, height: fill ? 'auto' : size }}
                onComplete={() => {
                    if (pingPong && lottieRef.current) {
                        // Simple ping-pong: flip direction and play again after a brief delay
                        setTimeout(() => {
                            const inst = lottieRef.current
                            if (!inst) return
                            const newDir: 1 | -1 = (direction * -1) as 1 | -1
                            setDirection(newDir)
                            try {
                                inst.setDirection(newDir)
                                inst.play()
                            } catch { }
                        }, 1000)
                    }
                    onComplete?.()
                }}
            />
        </div>
    )
}



'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button"; // Or your custom button
import { RefreshCcw, Check, Sparkles } from "lucide-react";

interface ProfileGradientGeneratorProps {
    onImageGenerated: (base64: string) => void;
    initialImage?: string | null;
}

const ProfileGradientGenerator: React.FC<ProfileGradientGeneratorProps> = ({
    onImageGenerated,
    initialImage
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage || null);
    const [withGrain, setWithGrain] = useState(false);

    // Function to generate random color
    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    // Main Generation Logic
    const generateGradient = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = 500;
        const h = 500;
        canvas.width = w;
        canvas.height = h;

        // 1. Randomize Gradient Type
        const type = Math.random() > 0.5 ? 'LINEAR' : 'RADIAL';
        let gradient;

        if (type === 'LINEAR') {
            const angle = Math.random() * Math.PI * 2;
            const x1 = w / 2 + Math.cos(angle) * w;
            const y1 = h / 2 + Math.sin(angle) * h;
            const x2 = w / 2 - Math.cos(angle) * w;
            const y2 = h / 2 - Math.sin(angle) * h;
            gradient = ctx.createLinearGradient(0, 0, w, h);
        } else {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.max(w, h) * (0.5 + Math.random() * 0.5);
            gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        }

        // 2. Add Colors
        const stopCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 stops
        for (let i = 0; i < stopCount; i++) {
            gradient.addColorStop(i / (stopCount - 1), getRandomColor());
        }

        // 3. Fill Background
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // 4. Add Grain (Noise) if enabled
        if (withGrain) {
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 40; // Intensity 40
                data[i] = Math.min(255, Math.max(0, data[i] + noise));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
            }
            ctx.putImageData(imageData, 0, 0);
        }

        // 5. Update Preview & Emit
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewUrl(dataUrl);
        onImageGenerated(dataUrl);

    }, [withGrain, onImageGenerated]);

    // Initial load - Do not auto generate to keep current if exists
    // But if we toggle grain, we might want to regenerate OR re-apply grain to current seed (complex).
    // Simple approach: Toggle grain -> Regenerate new gradient for now, or just re-run generate.
    // User asked "Add a generate button".

    // Effect to regenerate when Grain changes? 
    // User might want to keep the color but add grain. 
    // To do that, I'd need to store the gradient params. 
    // For MVP transparency: "Générer" generates everything.

    // Actually, let's keep it simple: Re-generate on click. Toggle grain affects NEXT generation or current?
    // Let's make toggle affect next generation to be safe, or trigger it immediately.
    // Let's trigger immediately for better UX.
    useEffect(() => {
        // Only if user explicitly interacted?
        // Let's rely on manual "Générer" button for color change, but auto-update if grain changes?
        // No, that changes color too. 
        // User asked "Generate new gradient".
    }, []);

    return (
        <div className="flex flex-col gap-4">
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex flex-col sm:flex-row gap-6 items-center">
                {/* Preview Circle */}
                <div className="relative group shrink-0">
                    <div
                        className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg transition-transform hover:scale-105"
                        style={{ background: previewUrl ? `url(${previewUrl}) center/cover` : '#f5f5f5' }}
                    >
                        {!previewUrl && <div className="w-full h-full flex items-center justify-center text-neutral-300">?</div>}
                    </div>
                    {/* Edit overlay hint could go here */}
                </div>

                <div className="flex flex-col gap-3 w-full max-w-sm">
                    <div className="flex items-center justify-between py-3 bg-neutral-100 p-2 rounded-lg">
                        <span className="text-sm font-medium px-2 text-neutral-600 flex items-center gap-2">
                            <Sparkles size={16} />
                            Effet Grain
                        </span>
                        <button
                            onClick={() => {
                                setWithGrain(!withGrain);
                                // Optional: immediately regenerate to show effect
                                setTimeout(generateGradient, 0);
                            }}
                            className={`
                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
                                ${withGrain ? 'bg-black' : 'bg-neutral-300'}
                            `}
                        >
                            <span className={`${withGrain ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`} />
                        </button>
                    </div>

                    <Button
                        label="Générer un dégradé"
                        onClick={generateGradient}
                        icon={RefreshCcw}
                        size="md"
                        variant="outline"
                    />
                </div>
            </div>

            <div className="text-xs text-neutral-500">
                Cliquez sur &quot;Générer&quot; pour créer un avatar unique basé sur des dégradés aléatoires.
            </div>
        </div>
    );
}

export default ProfileGradientGenerator;

import { motion } from 'framer-motion';
import { Pencil, Square as Ruler, BookOpen, GraduationCap, School, Eraser, Calculator, Backpack, PenTool, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface SupplyItem {
    id: number;
    Icon: LucideIcon;
    size: number;
    initialX: number;
    initialY: number;
    duration: number;
    delay: number;
    rotate: number;
}

export function SchoolSuppliesBackground() {
    const [items] = useState<SupplyItem[]>(() => {
        const icons = [Pencil, Ruler, BookOpen, GraduationCap, School, Eraser, Calculator, Backpack, PenTool];
        const newItems: SupplyItem[] = [];

        for (let i = 0; i < 15; i++) {
            newItems.push({
                id: i,
                Icon: icons[Math.floor(Math.random() * icons.length)],
                size: Math.floor(Math.random() * (40 - 20) + 20),
                initialX: Math.random() * 100,
                initialY: Math.random() * 100,
                duration: Math.random() * (30 - 15) + 15,
                delay: Math.random() * -20,
                rotate: Math.random() * 360,
            });
        }
        return newItems;
    });

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none">
            {items.map((item) => (
                <motion.div
                    key={item.id}
                    initial={{
                        x: `${item.initialX}vw`,
                        y: `${item.initialY}vh`,
                        rotate: item.rotate
                    }}
                    animate={{
                        x: [
                            `${item.initialX}vw`,
                            `${(item.initialX + 10) % 100}vw`,
                            `${(item.initialX - 10 + 100) % 100}vw`,
                            `${item.initialX}vw`
                        ],
                        y: [
                            `${item.initialY}vh`,
                            `${(item.initialY + 15) % 100}vh`,
                            `${(item.initialY - 15 + 100) % 100}vh`,
                            `${item.initialY}vh`
                        ],
                        rotate: item.rotate + 360
                    }}
                    transition={{
                        duration: item.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: item.delay
                    }}
                    className="absolute text-primary/10 dark:text-primary/10 blur-[0.4px]"
                >
                    <item.Icon size={item.size} strokeWidth={1.5} />
                </motion.div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent dark:via-primary/5 pointer-events-none" />
        </div>
    );
}

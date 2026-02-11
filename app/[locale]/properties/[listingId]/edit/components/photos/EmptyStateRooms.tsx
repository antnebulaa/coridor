'use client';

import { motion } from "framer-motion";
import { CopyPlus } from "lucide-react";

interface EmptyStateRoomsProps {
    onCreateClick: () => void;
}

const EmptyStateRooms: React.FC<EmptyStateRoomsProps> = ({ onCreateClick }) => {
    return (
        <div className="w-full flex flex-col items-center justify-center py-2 px-0">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl p-8 md:p-12 overflow-hidden text-center"
            >
                {/* Background Decorations */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-50%] left-[-20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-60" />
                    <div className="absolute bottom-[-50%] right-[-20%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl opacity-60" />
                </div>

                {/* Floating Photo Composition */}
                <div className="relative z-10 flex items-center justify-center mb-12 mt-4">
                    <div className="relative">
                        {/* Central Main Photo */}
                        <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center rotate-3 border border-neutral-50 overflow-hidden relative">
                            <img src="/images/room-1.jpg" alt="Exemple de pièce" className="absolute inset-0 w-full h-full object-cover" />
                        </div>

                        {/* Top Right Floating Photo */}
                        <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute -right-4 -top-4 w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center -rotate-6 border border-neutral-50 overflow-hidden"
                        >
                            <img src="/images/room-2.jpg" alt="Exemple de pièce" className="w-full h-full object-cover" />
                        </motion.div>

                        {/* Bottom Left Floating Photo */}
                        <motion.div
                            animate={{ y: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
                            className="absolute -left-4 -bottom-2 w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center rotate-6 border border-neutral-50 overflow-hidden"
                        >
                            <img src="/images/room-3.png" alt="Exemple de pièce" className="w-full h-full object-cover" />
                        </motion.div>
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-md mx-auto space-y-4">
                    <h2 className="text-3xl md:text-3xl font-medium text-neutral-900 tracking-tight">
                        Donnez vie à votre annonce
                    </h2>
                    <p className="text-neutral-500 leading-relaxed">
                        Organiser vos photos par pièce, aide les voyageurs à se projeter instantanément.
                    </p>

                    <div className="pt-6">
                        <button
                            onClick={onCreateClick}
                            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-neutral-900 text-white font-medium rounded-3xl overflow-hidden transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                        >
                            <span className="absolute inset-0 bg-linear-to-r from-neutral-800 to-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CopyPlus className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">Créer ma première pièce</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default EmptyStateRooms;

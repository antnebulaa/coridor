'use client';

import { Calculator, ArrowRight } from "lucide-react";
import Link from "next/link";

const FiscalWidget = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed

    // Show only during April (3), May (4), June (5)
    if (month < 3 || month > 5) return null;

    const year = now.getFullYear() - 1; // Previous fiscal year

    return (
        <section className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Calculator className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                        <h3 className="font-medium text-amber-900">Recap fiscal {year}</h3>
                        <p className="text-sm text-amber-700">Votre recap pour la declaration 2044 est pret</p>
                    </div>
                </div>
                <Link
                    href="/account/fiscal"
                    className="flex items-center gap-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition"
                >
                    Consulter
                    <ArrowRight size={14} />
                </Link>
            </div>
        </section>
    );
};

export default FiscalWidget;

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ChevronLeft, X, Check,
    Wallet, FileText, ShieldCheck, Home, CalendarCheck,
    Clock, Sparkles, MessageCircle, Eye, Target,
    ThumbsUp, Minus, ThumbsDown, Heart
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface ScorecardSheetProps {
    isOpen: boolean;
    onClose: () => void;
    visit: {
        id: string;
        date: string;
        startTime: string;
        candidate: {
            name: string;
            id: string;
        };
    };
    applicationId: string;
    listing: {
        id: string;
        title: string;
        price: number;
        leaseType?: string | null;
        availableFrom?: string | null;
    };
    tenantProfile?: {
        netSalary?: number | null;
        jobType?: string | null;
        jobTitle?: string | null;
        partnerNetSalary?: number | null;
        partnerJobType?: string | null;
        bio?: string | null;
        aplAmount?: number | null;
        guarantors?: any[];
        additionalIncomes?: any[];
    } | null;
    candidateScope?: {
        targetLeaseType?: string | null;
        targetMoveInDate?: string | null;
    } | null;
    existingEvaluation?: {
        id: string;
        decision: string;
        scores: { criterion: string; score: number }[];
    } | null;
    onEvaluationSaved: () => void;
}

type Decision = 'SHORTLISTED' | 'UNDECIDED' | 'ELIMINATED' | null;
type ImpressionCriterion = 'PUNCTUALITY' | 'INTEREST_LEVEL' | 'QUESTIONS_ASKED' | 'CONDITIONS_GRASPED' | 'RENTAL_PROJECT';

// ────────────────────────────────────────────────────────────────────────────
// Step Definitions
// ────────────────────────────────────────────────────────────────────────────

const CRITERIA_STEPS: {
    key: ImpressionCriterion;
    icon: React.ElementType;
    title: string;
    subtitle: string;
    options: { label: string; desc: string }[];
}[] = [
    {
        key: 'PUNCTUALITY',
        icon: Clock,
        title: 'Ponctualité',
        subtitle: 'Le candidat est-il arrive a l\'heure ?',
        options: [
            { label: "A l'heure", desc: 'Ponctuel ou en avance' },
            { label: 'En retard', desc: 'Quelques minutes de retard' },
            { label: 'Absent', desc: 'Ne s\'est pas presente' },
        ],
    },
    {
        key: 'INTEREST_LEVEL',
        icon: Sparkles,
        title: 'Niveau d\'intérêt',
        subtitle: 'Le candidat semblait-il intéressé ?',
        options: [
            { label: 'Fort intérêt', desc: 'Enthousiaste et engagé' },
            { label: 'Modéré', desc: 'Intéressé sans plus' },
            { label: 'Faible', desc: 'Peu d\'intérêt visible' },
        ],
    },
    {
        key: 'QUESTIONS_ASKED',
        icon: MessageCircle,
        title: 'Questions posées',
        subtitle: 'A-t-il posé des questions pertinentes ?',
        options: [
            { label: 'Beaucoup', desc: 'Questions pertinentes et nombreuses' },
            { label: 'Quelques-unes', desc: 'Questions basiques' },
            { label: 'Aucune', desc: 'Pas de questions' },
        ],
    },
    {
        key: 'CONDITIONS_GRASPED',
        icon: Eye,
        title: 'Compréhension',
        subtitle: 'A-t-il bien compris les conditions du bail ?',
        options: [
            { label: 'Parfaitement', desc: 'Tout est clair pour lui' },
            { label: 'Partiellement', desc: 'Quelques zones d\'ombre' },
            { label: 'Pas du tout', desc: 'Conditions mal comprises' },
        ],
    },
    {
        key: 'RENTAL_PROJECT',
        icon: Target,
        title: 'Projet locatif',
        subtitle: 'Son projet de location est-il coherent ?',
        options: [
            { label: 'Clair', desc: 'Projet bien defini et coherent' },
            { label: 'Vague', desc: 'Grandes lignes seulement' },
            { label: 'Flou', desc: 'Pas de projet clair' },
        ],
    },
];

// Total: dossier(0) + 5 criteria(1-5) + coup de coeur(6) + decision(7)
const TOTAL_STEPS = 8;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const gradients = [
    'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
];

function getGradient(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '')).toUpperCase();
}

function getDisplayName(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'Candidat';
    const firstName = parts[0];
    const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0]?.toUpperCase() + '.' : '';
    return `${firstName} ${lastInitial}`.trim();
}

function computeIncomeRatio(netSalary: number | null | undefined, price: number): { ratio: number; badge: 'green' | 'yellow' | 'red'; label: string; gliLabel: string; gliBadge: 'green' | 'yellow' | 'red' } {
    if (!netSalary || !price) return { ratio: 0, badge: 'yellow', label: 'N/A', gliLabel: '', gliBadge: 'yellow' };
    const ratio = (netSalary * 12) / (price * 12);
    const badge = ratio >= 3 ? 'green' : 'yellow';
    const gliEligible = ratio >= 3;
    return { ratio, badge, label: `${ratio.toFixed(1)}x`, gliLabel: gliEligible ? 'Éligible GLI' : 'Hors critères GLI', gliBadge: gliEligible ? 'green' : 'yellow' };
}

function computeProfileCompleteness(profile: ScorecardSheetProps['tenantProfile']): { pct: number; badge: 'green' | 'yellow' | 'red'; label: string } {
    if (!profile) return { pct: 0, badge: 'red', label: '0%' };
    const fields = [profile.netSalary, profile.jobType, profile.jobTitle, profile.bio];
    const filled = fields.filter((f) => f !== null && f !== undefined && f !== '').length;
    const pct = Math.round((filled / fields.length) * 100);
    const badge = pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red';
    return { pct, badge, label: `${pct}%` };
}

function computeGuarantor(guarantors: any[] | undefined): { badge: 'green' | 'red'; label: string } {
    if (!guarantors || guarantors.length === 0) return { badge: 'red', label: 'Aucun' };
    const typeLabels: Record<string, string> = { VISALE: 'Visale', FAMILY: 'Physique', THIRD_PARTY: 'Tiers', LEGAL_ENTITY: 'Morale', CAUTIONNER: 'Cautionner', GARANTME: 'Garantme' };
    return { badge: 'green', label: typeLabels[guarantors[0]?.type] || 'Oui' };
}

function computeLeaseCompat(targetLeaseType: string | null | undefined, listingLeaseType: string | null | undefined): { badge: 'green' | 'yellow' | 'red'; label: string } {
    if (!targetLeaseType || !listingLeaseType) return { badge: 'yellow', label: 'Non renseigné' };
    if (targetLeaseType === 'ANY') return { badge: 'green', label: 'Compatible' };
    const mapping: Record<string, string[]> = { FURNISHED: ['SHORT_TERM', 'COLOCATION'], EMPTY: ['LONG_TERM'], MOBILITY: ['SHORT_TERM'] };
    const compatible = mapping[targetLeaseType];
    if (compatible && compatible.includes(listingLeaseType)) return { badge: 'green', label: 'Compatible' };
    if (targetLeaseType === 'FURNISHED' && listingLeaseType === 'LONG_TERM') return { badge: 'yellow', label: 'Partiel' };
    return { badge: 'red', label: 'Incompatible' };
}

function computeMoveInCompat(targetDate: string | null | undefined, availableFrom: string | null | undefined): { badge: 'green' | 'yellow' | 'red'; label: string } {
    if (!targetDate || !availableFrom) return { badge: 'yellow', label: 'N/A' };
    const diffDays = (new Date(targetDate).getTime() - new Date(availableFrom).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= -14 && diffDays <= 30) return { badge: 'green', label: 'Oui' };
    if (diffDays >= -30 && diffDays <= 60) return { badge: 'yellow', label: 'A voir' };
    return { badge: 'red', label: 'Non' };
}

function badgeToScore(badge: 'green' | 'yellow' | 'red'): number {
    if (badge === 'green') return 1;
    if (badge === 'yellow') return 2;
    return 3;
}

// ────────────────────────────────────────────────────────────────────────────
// Animation Variants
// ────────────────────────────────────────────────────────────────────────────

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 80 : -80,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction > 0 ? -80 : 80,
        opacity: 0,
    }),
};

const optionColors = [
    { bg: 'bg-emerald-50', border: 'border-emerald-200', activeBg: 'bg-emerald-500', text: 'text-emerald-700', activeText: 'text-white', dot: 'bg-emerald-500' },
    { bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-500', text: 'text-amber-700', activeText: 'text-white', dot: 'bg-amber-500' },
    { bg: 'bg-red-50', border: 'border-red-200', activeBg: 'bg-red-500', text: 'text-red-700', activeText: 'text-white', dot: 'bg-red-500' },
];

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

const ScorecardSheet: React.FC<ScorecardSheetProps> = ({
    isOpen,
    onClose,
    visit,
    applicationId,
    listing,
    tenantProfile,
    candidateScope,
    existingEvaluation,
    onEvaluationSaved,
}) => {
    const [mounted, setMounted] = useState(false);
    const [showSheet, setShowSheet] = useState(false);
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [impressionScores, setImpressionScores] = useState<Record<ImpressionCriterion, number | null>>(() => {
        if (existingEvaluation?.scores) {
            const initial: Record<string, number | null> = {};
            for (const c of CRITERIA_STEPS) {
                const found = existingEvaluation.scores.find((s) => s.criterion === c.key);
                initial[c.key] = found ? found.score : null;
            }
            return initial as Record<ImpressionCriterion, number | null>;
        }
        return { PUNCTUALITY: null, INTEREST_LEVEL: null, QUESTIONS_ASKED: null, CONDITIONS_GRASPED: null, RENTAL_PROJECT: null };
    });

    const [decision, setDecision] = useState<Decision>(
        (existingEvaluation?.decision as Decision) || null
    );

    const [coupDeCoeur, setCoupDeCoeur] = useState<boolean>(() => {
        if (existingEvaluation?.scores) {
            const found = existingEvaluation.scores.find((s) => s.criterion === 'COUP_DE_COEUR');
            return found ? found.score === 1 : false;
        }
        return false;
    });

    // Dossier data (auto-calculated)
    const incomeData = useMemo(() => computeIncomeRatio(tenantProfile?.netSalary, listing.price), [tenantProfile?.netSalary, listing.price]);
    const completenessData = useMemo(() => computeProfileCompleteness(tenantProfile), [tenantProfile]);
    const guarantorData = useMemo(() => computeGuarantor(tenantProfile?.guarantors), [tenantProfile?.guarantors]);
    const leaseData = useMemo(() => computeLeaseCompat(candidateScope?.targetLeaseType, listing.leaseType), [candidateScope?.targetLeaseType, listing.leaseType]);
    const moveInData = useMemo(() => computeMoveInCompat(candidateScope?.targetMoveInDate, listing.availableFrom), [candidateScope?.targetMoveInDate, listing.availableFrom]);

    // Mount & animate
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen) {
            setShowSheet(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setDirection(1);
            setSelectedOption(null);
            if (!existingEvaluation) {
                setImpressionScores({ PUNCTUALITY: null, INTEREST_LEVEL: null, QUESTIONS_ASKED: null, CONDITIONS_GRASPED: null, RENTAL_PROJECT: null });
                setDecision(null);
                setCoupDeCoeur(false);
            }
        }
    }, [isOpen, existingEvaluation]);

    const handleClose = useCallback(() => {
        if (isLoading) return;
        setShowSheet(false);
        setTimeout(onClose, 300);
    }, [isLoading, onClose]);

    const goNext = useCallback(() => {
        setDirection(1);
        setSelectedOption(null);
        setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    }, []);

    const goBack = useCallback(() => {
        setDirection(-1);
        setSelectedOption(null);
        setStep((prev) => Math.max(prev - 1, 0));
    }, []);

    const handleCriterionSelect = useCallback((criterion: ImpressionCriterion, score: number) => {
        setImpressionScores((prev) => ({ ...prev, [criterion]: score }));
        setSelectedOption(score);
        // Auto-advance after visual feedback
        setTimeout(goNext, 400);
    }, [goNext]);

    const handleDecisionSelect = useCallback((d: Decision) => {
        setDecision(d);
    }, []);

    const handleSubmit = useCallback(async () => {
        setIsLoading(true);
        try {
            const scores: Record<string, number> = {};

            // Auto dossier scores
            scores['FILE_COMPLETENESS'] = badgeToScore(completenessData.badge);
            scores['INCOME_ADEQUACY'] = badgeToScore(incomeData.badge);
            scores['GUARANTOR_QUALITY'] = badgeToScore(guarantorData.badge);
            scores['LEASE_COMPATIBILITY'] = badgeToScore(leaseData.badge);
            scores['MOVE_IN_FLEXIBILITY'] = badgeToScore(moveInData.badge);

            // Impression scores
            for (const [criterion, score] of Object.entries(impressionScores)) {
                if (score !== null) scores[criterion] = score;
            }

            // Coup de coeur
            scores['COUP_DE_COEUR'] = coupDeCoeur ? 1 : 3;

            await axios.post('/api/evaluations', {
                visitId: visit.id,
                applicationId,
                decision: decision || 'UNDECIDED',
                scores,
            });

            toast.success('Evaluation enregistree');
            onEvaluationSaved();
            handleClose();
        } catch (error: any) {
            console.error('SCORECARD_SUBMIT_ERROR', error);
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setIsLoading(false);
        }
    }, [impressionScores, decision, coupDeCoeur, visit.id, applicationId, completenessData, incomeData, guarantorData, leaseData, moveInData, onEvaluationSaved, handleClose]);

    // ── Derived values ──
    const candidateName = visit.candidate?.name || 'Candidat';
    const displayName = getDisplayName(candidateName);
    const initials = getInitials(candidateName);
    const gradient = getGradient(candidateName);

    let visitDateFormatted = '';
    try {
        visitDateFormatted = format(new Date(visit.date), 'd MMMM yyyy', { locale: fr });
    } catch {
        visitDateFormatted = visit.date;
    }

    const progress = ((step + 1) / TOTAL_STEPS) * 100;
    const canSubmit = decision !== null && !isLoading;
    const isDarkStep = step === 7;

    // Sync iOS status bar color with dark step via theme-color meta tag
    useEffect(() => {
        if (!isOpen) return;

        let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        const originalTheme = meta.content;
        meta.content = isDarkStep ? '#0a0a0a' : '#ffffff';

        return () => {
            if (meta) meta.content = originalTheme;
        };
    }, [isDarkStep, isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <AnimatePresence onExitComplete={() => { if (!isOpen) setShowSheet(false); }}>
            {showSheet && (
                <div className="fixed inset-0 z-9999">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-black/40"
                        onClick={handleClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0, backgroundColor: isDarkStep ? '#0a0a0a' : '#ffffff' }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="absolute inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[85vh] md:rounded-3xl flex flex-col overflow-hidden pt-safe md:pt-0"
                    >
                        {/* Progress bar */}
                        <motion.div
                            className="h-1 w-full shrink-0"
                            animate={{ backgroundColor: isDarkStep ? '#262626' : '#f5f5f5' }}
                            transition={{ duration: 0.4 }}
                        >
                            <motion.div
                                className="h-full rounded-r-full"
                                initial={false}
                                animate={{
                                    width: `${progress}%`,
                                    backgroundColor: isDarkStep ? '#ffffff' : '#171717',
                                }}
                                transition={{ duration: 0.4, ease: 'easeInOut' }}
                            />
                        </motion.div>

                        {/* Top navigation */}
                        <div className="flex items-center justify-between px-5 py-4 shrink-0">
                            <button
                                onClick={step > 0 ? goBack : handleClose}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
                                    isDarkStep
                                        ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                                }`}
                            >
                                {step > 0 ? <ChevronLeft size={20} /> : <X size={18} />}
                            </button>

                            {/* Step dots */}
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`rounded-full transition-all duration-300 ${
                                            i === step
                                                ? isDarkStep ? 'w-6 h-2 bg-white' : 'w-6 h-2 bg-neutral-900'
                                                : i < step
                                                    ? isDarkStep ? 'w-2 h-2 bg-white' : 'w-2 h-2 bg-neutral-900'
                                                    : isDarkStep ? 'w-2 h-2 bg-neutral-600' : 'w-2 h-2 bg-neutral-200'
                                        }`}
                                    />
                                ))}
                            </div>

                            <div className="w-10" /> {/* Spacer for alignment */}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden">
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={step}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="px-6 pb-8"
                                >
                                    {/* Step 0: Dossier Overview */}
                                    {step === 0 && (
                                        <DossierStep
                                            displayName={displayName}
                                            initials={initials}
                                            gradient={gradient}
                                            listingTitle={listing.title}
                                            visitDate={visitDateFormatted}
                                            visitTime={visit.startTime}
                                            incomeData={incomeData}
                                            completenessData={completenessData}
                                            guarantorData={guarantorData}
                                            leaseData={leaseData}
                                            moveInData={moveInData}
                                            onContinue={goNext}
                                        />
                                    )}

                                    {/* Steps 1-5: Criteria */}
                                    {step >= 1 && step <= 5 && (
                                        <CriterionStep
                                            config={CRITERIA_STEPS[step - 1]}
                                            currentScore={impressionScores[CRITERIA_STEPS[step - 1].key]}
                                            selectedOption={selectedOption}
                                            onSelect={(score) => handleCriterionSelect(CRITERIA_STEPS[step - 1].key, score)}
                                            stepNumber={step}
                                            totalCriteria={5}
                                        />
                                    )}

                                    {/* Step 6: Coup de coeur */}
                                    {step === 6 && (
                                        <CoupDeCoeurStep
                                            coupDeCoeur={coupDeCoeur}
                                            onToggle={() => setCoupDeCoeur((prev) => !prev)}
                                            onContinue={goNext}
                                            displayName={displayName}
                                        />
                                    )}

                                    {/* Step 7: Decision */}
                                    {step === 7 && (
                                        <DecisionStep
                                            decision={decision}
                                            onSelect={handleDecisionSelect}
                                            onSubmit={handleSubmit}
                                            canSubmit={canSubmit}
                                            isLoading={isLoading}
                                            displayName={displayName}
                                            initials={initials}
                                            gradient={gradient}
                                            impressionScores={impressionScores}
                                            coupDeCoeur={coupDeCoeur}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
};

// ────────────────────────────────────────────────────────────────────────────
// Step 0: Dossier Overview
// ────────────────────────────────────────────────────────────────────────────

const DossierStep: React.FC<{
    displayName: string;
    initials: string;
    gradient: string;
    listingTitle: string;
    visitDate: string;
    visitTime: string;
    incomeData: { label: string; badge: 'green' | 'yellow' | 'red'; gliLabel: string; gliBadge: 'green' | 'yellow' | 'red' };
    completenessData: { label: string; badge: 'green' | 'yellow' | 'red' };
    guarantorData: { label: string; badge: 'green' | 'red' };
    leaseData: { label: string; badge: 'green' | 'yellow' | 'red' };
    moveInData: { label: string; badge: 'green' | 'yellow' | 'red' };
    onContinue: () => void;
}> = ({
    displayName, initials, gradient, listingTitle, visitDate, visitTime,
    incomeData, completenessData, guarantorData, leaseData, moveInData,
    onContinue,
}) => {
    const badgeColor = {
        green: 'bg-emerald-100 text-emerald-700',
        yellow: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-700',
    };

    const indicators: { icon: React.ElementType; label: string; value: string; badge: 'green' | 'yellow' | 'red'; subValue?: string; subBadge?: 'green' | 'yellow' | 'red' }[] = [
        { icon: Wallet, label: 'Revenus', value: incomeData.label, badge: incomeData.badge, subValue: incomeData.gliLabel, subBadge: incomeData.gliBadge },
        { icon: FileText, label: 'Dossier', value: completenessData.label, badge: completenessData.badge },
        { icon: ShieldCheck, label: 'Garant', value: guarantorData.label, badge: guarantorData.badge },
        { icon: Home, label: 'Type bail', value: leaseData.label, badge: leaseData.badge },
        { icon: CalendarCheck, label: 'Emménagement', value: moveInData.label, badge: moveInData.badge },
    ];

    return (
        <div className="flex flex-col items-center">
            {/* Avatar + Info */}
            <div className="flex flex-col items-center mb-8 mt-2">
                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-medium shadow-lg mb-4"
                    style={{ background: gradient }}
                >
                    {initials}
                </div>
                <h2 className="text-2xl font-medium text-neutral-900">{displayName}</h2>
                 <p className="text-sm text-neutral-400 mt-1">Visite du {visitDate} a {visitTime}</p>
                <p className="text-sm text-neutral-500 mt-1">{listingTitle}</p>
            
            </div>

            {/* Dossier Indicators */}
            <div className="w-full space-y-2 mb-8">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Resumé du dossier</p>
                {indicators.map(({ icon: Icon, label, value, badge, subValue, subBadge }) => (
                    <div key={label} className="flex items-center justify-between py-3 px-4 bg-neutral-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                <Icon size={16} className="text-neutral-500" />
                            </div>
                            <span className="text-sm font-medium text-neutral-700">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${badgeColor[badge]}`}>
                                {value}
                            </span>
                            {subValue && (
                                <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${badgeColor[subBadge || badge]}`}>
                                    {subValue}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* CTA */}
            <button
                onClick={onContinue}
                className="w-full py-4 bg-neutral-900 text-white rounded-3xl font-semibold text-base hover:bg-neutral-800 active:scale-[0.98] transition"
            >
                Commencer l'evaluation
            </button>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────────
// Steps 1-5: Individual Criterion
// ────────────────────────────────────────────────────────────────────────────

const CriterionStep: React.FC<{
    config: typeof CRITERIA_STEPS[number];
    currentScore: number | null;
    selectedOption: number | null;
    onSelect: (score: number) => void;
    stepNumber: number;
    totalCriteria: number;
}> = ({ config, currentScore, selectedOption, onSelect, stepNumber, totalCriteria }) => {
    const Icon = config.icon;

    return (
        <div className="flex flex-col items-center pt-4">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-6">
                <Icon size={28} className="text-neutral-700" />
            </div>

            {/* Question */}
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
                Question {stepNumber}/{totalCriteria}
            </p>
            <h2 className="text-3xl font-medium text-neutral-900 text-center mb-2">
                {config.title}
            </h2>
            <p className="text-base text-neutral-500 text-center mb-10">
                {config.subtitle}
            </p>

            {/* Options */}
            <div className="w-full space-y-3">
                {config.options.map((option, idx) => {
                    const score = idx + 1; // 1=bon, 2=moyen, 3=faible
                    const isSelected = selectedOption === score || (selectedOption === null && currentScore === score);
                    const colors = optionColors[idx];

                    return (
                        <motion.button
                            key={option.label}
                            onClick={() => onSelect(score)}
                            whileTap={{ scale: 0.97 }}
                            className={`
                                w-full flex items-center gap-4 p-5 rounded-3xl border-2 text-left transition-all duration-200
                                ${isSelected
                                    ? `${colors.activeBg} ${colors.activeText} border-transparent shadow-lg`
                                    : `bg-white ${colors.border} hover:${colors.bg} hover:shadow-sm`
                                }
                            `}
                        >
                            {/* Radio circle / check */}
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all
                                ${isSelected
                                    ? 'bg-white/30'
                                    : 'border-2 border-neutral-300'
                                }
                            `}>
                                {isSelected && (
                                    <Check size={16} className="text-white" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className={`font-medium text-[18px] ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                                    {option.label}
                                </div>
                                <div className={`text-sm mt-0.5 ${isSelected ? 'text-white/80' : 'text-neutral-500'}`}>
                                    {option.desc}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────────
// Step 6: Coup de coeur
// ────────────────────────────────────────────────────────────────────────────

const CoupDeCoeurStep: React.FC<{
    coupDeCoeur: boolean;
    onToggle: () => void;
    onContinue: () => void;
    displayName: string;
}> = ({ coupDeCoeur, onToggle, onContinue, displayName }) => {
    return (
        <div className="flex flex-col items-center pt-8">
            <p className="text-xs font-medium text-rose-500 uppercase tracking-wider mb-4">
                Bonus
            </p>
            <h2 className="text-3xl font-medium text-neutral-900 text-center mb-2">
                Coup de coeur
            </h2>
            <p className="text-base text-neutral-500 text-center mb-12">
                {displayName} a t-il ce "je ne sais quoi"?
            </p>

            {/* Heart toggle */}
            <motion.button
                onClick={onToggle}
                whileTap={{ scale: 0.9 }}
                className="relative mb-12"
            >
                <motion.div
                    animate={{
                        scale: coupDeCoeur ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className={`
                        w-28 h-28 rounded-full flex items-center justify-center transition-colors duration-300
                        ${coupDeCoeur
                            ? 'bg-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.35)]'
                            : 'bg-neutral-100 hover:bg-neutral-200'
                        }
                    `}
                >
                    <Heart
                        size={48}
                        className={`transition-colors duration-300 ${coupDeCoeur ? 'text-white' : 'text-neutral-400'}`}
                        fill={coupDeCoeur ? 'currentColor' : 'none'}
                    />
                </motion.div>

                {/* Sparkle particles when active */}
                <AnimatePresence>
                    {coupDeCoeur && (
                        <>
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0.5],
                                        x: Math.cos((i * 60 * Math.PI) / 180) * 60,
                                        y: Math.sin((i * 60 * Math.PI) / 180) * 60,
                                    }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-rose-400 -translate-x-1/2 -translate-y-1/2"
                                />
                            ))}
                        </>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Status text */}
            <p className={`text-base font-medium mb-10 transition-colors duration-300 ${
                coupDeCoeur ? 'text-rose-500' : 'text-neutral-400'
            }`}>
                {coupDeCoeur ? 'Coup de coeur activé !' : 'Appuyez pour activer'}
            </p>

            {/* Continue / Skip button */}
            <button
                onClick={onContinue}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-semibold text-base hover:bg-neutral-800 active:scale-[0.98] transition"
            >
                {coupDeCoeur ? 'Continuer' : 'Passer'}
            </button>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────────
// Step 7: Decision (Dark mode + Recap)
// ────────────────────────────────────────────────────────────────────────────

const CRITERIA_LABELS: { key: ImpressionCriterion; label: string; icon: React.ElementType }[] = [
    { key: 'PUNCTUALITY', label: 'Ponctualité', icon: Clock },
    { key: 'INTEREST_LEVEL', label: 'Intérêt', icon: Sparkles },
    { key: 'QUESTIONS_ASKED', label: 'Questions', icon: MessageCircle },
    { key: 'CONDITIONS_GRASPED', label: 'Compréhension', icon: Eye },
    { key: 'RENTAL_PROJECT', label: 'Projet', icon: Target },
];

const DecisionStep: React.FC<{
    decision: Decision;
    onSelect: (d: Decision) => void;
    onSubmit: () => void;
    canSubmit: boolean;
    isLoading: boolean;
    displayName: string;
    initials: string;
    gradient: string;
    impressionScores: Record<ImpressionCriterion, number | null>;
    coupDeCoeur: boolean;
}> = ({ decision, onSelect, onSubmit, canSubmit, isLoading, displayName, initials, gradient, impressionScores, coupDeCoeur }) => {

    // Compute composite score (0-10)
    const answeredScores = Object.values(impressionScores).filter((v): v is number => v !== null);
    const rawTotal = answeredScores.reduce((sum, s) => sum + (4 - s), 0); // 1→3pts, 2→2pts, 3→1pt
    const maxTotal = answeredScores.length * 3;
    const compositeScore = maxTotal > 0 ? (rawTotal / maxTotal) * 10 : 0;

    // Letter grade: A >= 7, B >= 4, C < 4 — coup de coeur boosts by one tier
    const rawGrade = compositeScore >= 7 ? 'A' : compositeScore >= 4 ? 'B' : 'C';
    const grade = coupDeCoeur
        ? (rawGrade === 'C' ? 'B' : rawGrade === 'B' ? 'A' : 'A')
        : rawGrade;

    const gradeColor = grade === 'A' ? 'text-emerald-400' : grade === 'B' ? 'text-amber-400' : 'text-red-400';
    const gradeBgClass = grade === 'A' ? 'bg-emerald-500/15 border-emerald-500/30' : grade === 'B' ? 'bg-amber-500/15 border-amber-500/30' : 'bg-red-500/15 border-red-500/30';

    const dotColor = (score: number | null) => {
        if (score === null) return 'bg-neutral-600';
        if (score === 1) return 'bg-emerald-400';
        if (score === 2) return 'bg-amber-400';
        return 'bg-red-400';
    };

    const decisions: {
        key: Decision;
        icon: React.ElementType;
        label: string;
        desc: string;
        selectedBg: string;
        selectedShadow: string;
        unselectedBg: string;
        unselectedBorder: string;
        iconBg: string;
        iconColor: string;
        selectedIconBg: string;
    }[] = [
        {
            key: 'SHORTLISTED',
            icon: ThumbsUp,
            label: 'Shortlister',
            desc: 'Candidat intéressant, à retenir',
            selectedBg: 'bg-emerald-500',
            selectedShadow: 'shadow-[0_0_30px_rgba(52,211,153,0.3)]',
            unselectedBg: 'bg-neutral-800/80',
            unselectedBorder: 'border-neutral-700',
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-400',
            selectedIconBg: 'bg-white/20',
        },
        {
            key: 'UNDECIDED',
            icon: Minus,
            label: 'Indécis',
            desc: 'À revoir, besoin de plus de temps',
            selectedBg: 'bg-neutral-600',
            selectedShadow: 'shadow-[0_0_30px_rgba(163,163,163,0.2)]',
            unselectedBg: 'bg-neutral-800/80',
            unselectedBorder: 'border-neutral-700',
            iconBg: 'bg-neutral-500/10',
            iconColor: 'text-neutral-400',
            selectedIconBg: 'bg-white/20',
        },
        {
            key: 'ELIMINATED',
            icon: ThumbsDown,
            label: 'Ecarter',
            desc: 'Candidature non retenue',
            selectedBg: 'bg-red-500',
            selectedShadow: 'shadow-[0_0_30px_rgba(248,113,113,0.3)]',
            unselectedBg: 'bg-neutral-800/80',
            unselectedBorder: 'border-neutral-700',
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-400',
            selectedIconBg: 'bg-white/20',
        },
    ];

    return (
        <div className="flex flex-col items-center pt-2">
            {/* ── Recap Card ── */}
            <div className="w-full rounded-3xl bg-neutral-800/60 border border-neutral-700/50 p-4 mb-8">
                {/* Avatar + Name + Grade */}
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                        style={{ background: gradient }}
                    >
                        {initials}
                    </div>
                    <div className="flex-1">
                        <div className="text-white font-medium text-xl">{displayName}</div>
                        {coupDeCoeur && rawGrade !== grade && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Heart size={12} className="text-rose-400" fill="currentColor" />
                                <span className="text-[10px] text-rose-400">Coup de coeur</span>
                            </div>
                        )}
                    </div>
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${gradeBgClass}`}>
                        <span className={`text-2xl font-bold ${gradeColor}`}>{grade}</span>
                    </div>
                </div>

                {/* Criteria dots */}
                <div className="flex items-center justify-between">
                    {CRITERIA_LABELS.map(({ key, label }) => (
                        <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
                            <div className={`w-3 h-3 rounded-full ${dotColor(impressionScores[key])}`} />
                            <span className="text-[10px] text-neutral-500 leading-none text-center">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Title ── */}
            <h2 className="text-3xl font-medium text-white text-center mb-1">
                Décision finale
            </h2>
            <p className="text-base text-neutral-400 text-center mb-8">
                Que pensez-vous de {displayName} ?
            </p>

            {/* ── Decision cards ── */}
            <div className="w-full space-y-3 mb-8">
                {decisions.map((d) => {
                    const isSelected = decision === d.key;
                    const Icon = d.icon;

                    return (
                        <motion.button
                            key={d.key}
                            onClick={() => onSelect(d.key)}
                            whileTap={{ scale: 0.97 }}
                            className={`
                                w-full flex items-center gap-4 p-3 rounded-3xl border text-left transition-all duration-200
                                ${isSelected
                                    ? `${d.selectedBg} border-transparent text-white ${d.selectedShadow}`
                                    : `${d.unselectedBg} ${d.unselectedBorder} hover:bg-neutral-700/80`
                                }
                            `}
                        >
                            <div className={`
                                w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all
                                ${isSelected ? d.selectedIconBg : d.iconBg}
                            `}>
                                <Icon size={22} className={isSelected ? 'text-white' : d.iconColor} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className={`font-medium text-[18px] ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                                    {d.label}
                                </div>
                                <div className={`text-sm mt-0.5 ${isSelected ? 'text-white/70' : 'text-neutral-500'}`}>
                                    {d.desc}
                                </div>
                            </div>

                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0"
                                >
                                    <Check size={16} className="text-white" />
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* ── Submit ── */}
            <button
                onClick={onSubmit}
                disabled={!canSubmit}
                className={`
                    w-full py-4 rounded-3xl font-medium text-base transition-all active:scale-[0.98]
                    ${canSubmit
                        ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                        : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    }
                `}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Enregistrement...
                    </span>
                ) : (
                    'Enregistrer l\'evaluation'
                )}
            </button>
        </div>
    );
};

export default ScorecardSheet;

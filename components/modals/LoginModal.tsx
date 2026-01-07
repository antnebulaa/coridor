'use client';

import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import { signIn } from 'next-auth/react';
import { AiFillGithub } from 'react-icons/ai';
import { FcGoogle } from 'react-icons/fc';
import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import useRegisterModal from '@/hooks/useRegisterModal';
import useLoginModal from '@/hooks/useLoginModal';
import Modal from './Modal';
import Heading from '../Heading';
import SoftInput from '../inputs/SoftInput';
import { Button } from '../ui/Button';
import CustomToast from '../ui/CustomToast';

const LoginModal = () => {
    const router = useRouter();
    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: {
            errors,
        },
    } = useForm<FieldValues>({
        defaultValues: {
            email: '',
            password: ''
        },
    });

    const onToggle = useCallback(() => {
        loginModal.onClose();
        registerModal.onOpen();
    }, [loginModal, registerModal]);

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        signIn('credentials', {
            ...data,
            redirect: false,
        })
            .then((callback) => {
                setIsLoading(false);

                if (callback?.ok) {
                    toast.custom((t) => (
                        <CustomToast
                            t={t}
                            message="Connexion réussie"
                            type="success"
                        />
                    ));
                    router.refresh();
                    loginModal.onClose();
                }

                if (callback?.error) {
                    toast.custom((t) => (
                        <CustomToast
                            t={t}
                            message={callback.error || "Erreur de connexion"}
                            type="error"
                        />
                    ));
                }
            });
    }

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading
                title="Welcome back"
                subtitle="Login to your account!"
            />
            <SoftInput
                id="email"
                label="Email"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />
            <SoftInput
                id="password"
                label="Password"
                type="password"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />
        </div>
    );

    const footerContent = (
        <div className="flex flex-col gap-4 mt-3">
            <hr />
            <hr />
            <div className="text-neutral-500 text-center mt-4 font-light">
                <p>First time using Airbnb?
                    <span
                        onClick={onToggle}
                        className="text-neutral-800 cursor-pointer hover:underline ml-2"
                    >
                        Create an account
                    </span>
                </p>
            </div>
        </div>
    );

    return (
        <Modal
            disabled={isLoading}
            isOpen={loginModal.isOpen}
            title="Login"
            actionLabel="Continue"
            onClose={loginModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            body={bodyContent}
            footer={footerContent}
        />
    );
};

export default LoginModal;

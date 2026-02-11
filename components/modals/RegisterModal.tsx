'use client';

import axios from 'axios';
import { AiFillGithub } from 'react-icons/ai';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import useRegisterModal from '@/hooks/useRegisterModal';
import useLoginModal from '@/hooks/useLoginModal';
import Modal from './Modal';
import Heading from '../Heading';
import SoftInput from '../inputs/SoftInput';
import { Button } from '../ui/Button';
import { signIn } from 'next-auth/react';
import CustomToast from '../ui/CustomToast';

import { useTranslations } from 'next-intl';

const RegisterModal = () => {
    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const [isLoading, setIsLoading] = useState(false);
    const tAuth = useTranslations('auth');
    const tCommon = useTranslations('common');

    const {
        register,
        handleSubmit,
        formState: {
            errors,
        },
    } = useForm<FieldValues>({
        defaultValues: {
            name: '',
            email: '',
            password: '',
            birthDate: '',
        },
    });

    const onToggle = useCallback(() => {
        registerModal.onClose();
        loginModal.onOpen();
    }, [registerModal, loginModal]);

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.post('/api/register', data)
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={tAuth('registerSuccess')}
                        type="success"
                    />
                ));
                registerModal.onClose();
                loginModal.onOpen();
            })
            .catch((error) => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={tAuth('genericError')}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading
                title={tAuth('welcomeToCoridor')}
                subtitle={tAuth('createAccount')}
            />
            <SoftInput
                id="email"
                label={tAuth('email')}
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />
            <SoftInput
                id="name"
                label={tAuth('name')}
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />
            <SoftInput
                id="password"
                label={tAuth('password')}
                type="password"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />
            <SoftInput
                id="birthDate"
                label={tAuth('birthDate')}
                type="date"
                className="appearance-none !min-h-[56px] !h-[56px] !max-h-[56px]"
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
            <Button
                variant="outline"
                label={tAuth('continueGoogle')}
                icon={FcGoogle}
                onClick={() => signIn('google')}
            />
            <Button
                variant="outline"
                label={tAuth('continueApple')}
                icon={FaApple}
                onClick={() => signIn('apple')}
            />
            <div className="text-neutral-500 text-center mt-4 font-light">
                <p>{tAuth('alreadyHaveAccount')}
                    <span
                        onClick={onToggle}
                        className="text-neutral-800 cursor-pointer hover:underline ml-2"
                    >
                        {tAuth('loginLink')}
                    </span>
                </p>
            </div>
        </div>
    );

    return (
        <Modal
            disabled={isLoading}
            isOpen={registerModal.isOpen}
            title={tAuth('registerTitle')}
            actionLabel={tCommon('continue')}
            onClose={registerModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            body={bodyContent}
            footer={footerContent}
        />
    );
};

export default RegisterModal;

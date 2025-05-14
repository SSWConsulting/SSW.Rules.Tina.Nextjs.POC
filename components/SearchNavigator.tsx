'use client';

import { useInstantSearch } from 'react-instantsearch-hooks-web';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    submitted: boolean;
    reset(): void;
};

export default function SearchNavigator({ submitted, reset }: Props) {
    const { results, status } = useInstantSearch();
    const router = useRouter();

    useEffect(() => {
        if (submitted && status === 'idle') {
            router.push(`/rules/search?keyword=${encodeURIComponent(results?.query ?? '')}`);
            reset();
        }
    }, [submitted, status, results, router, reset]);

    return null;
}

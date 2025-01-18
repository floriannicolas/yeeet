import Loader from '@/components/ui/loader';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Loading...',
};

export default function Loading() {
    return <Loader type='global' />;
}
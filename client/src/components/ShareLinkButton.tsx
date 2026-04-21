import { useState } from 'react';
import { generateShareLink } from '../api/client';

interface Props {
  projectId: string;
}

export default function ShareLinkButton({ projectId }: Props) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(window.location.origin + shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setLoading(true);
    try {
      const result = await generateShareLink(projectId);
      setShareUrl(result.shareUrl);
      await navigator.clipboard.writeText(
        window.location.origin + result.shareUrl
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to generate share link:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
    >
      {copied ? 'Copied!' : shareUrl ? 'Copy Share Link' : loading ? 'Generating...' : 'Generate Share Link'}
    </button>
  );
}

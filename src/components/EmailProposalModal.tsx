import React, { useEffect, useState } from 'react';
import { Mail, Share2, X } from 'lucide-react';
import {
  buildExecutiveEmailSummaryText,
  downloadOutlookDesktopEmlDraft,
  getSavedEmailChannelPref,
  isMobileOrTabletDevice,
  launchCorporateOutlookWeb,
  launchGmailComposeOrDraft,
  saveEmailChannelPref,
  shareProposalPackViaDevice,
  type EmailChannelPref
} from '../engine/emailPackExporter';
import type { EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';

interface EmailProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  clientId: string;
  driveToken: string;
  logoDataUrl?: string;
  onStatusNotice: (msg: string, tone?: 'success' | 'info' | 'warning') => void;
}

export const EmailProposalModal: React.FC<EmailProposalModalProps> = ({
  isOpen,
  onClose,
  project,
  eng,
  standards,
  clientId,
  driveToken,
  logoDataUrl,
  onStatusNotice
}) => {
  const isMobile = isMobileOrTabletDevice();
  const [selectedChannel, setSelectedChannel] = useState<EmailChannelPref>(() => {
    const saved = getSavedEmailChannelPref();
    if (saved) return saved;
    return isMobile ? 'share_sheet' : 'outlook_desktop';
  });
  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState(
    `Technical & Commercial Proposal — ${project.name} (${(eng.totalDesignContKw / 1000).toFixed(2)} MW)`
  );
  const [bodyText, setBodyText] = useState(() =>
    buildExecutiveEmailSummaryText(project, eng, standards)
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubject(
        `Technical & Commercial Proposal — ${project.name} (${(eng.totalDesignContKw / 1000).toFixed(2)} MW)`
      );
      setBodyText(buildExecutiveEmailSummaryText(project, eng, standards));
    }
  }, [isOpen, project, eng, standards]);

  if (!isOpen) return null;

  const chooseChannel = (ch: EmailChannelPref) => {
    setSelectedChannel(ch);
    saveEmailChannelPref(ch);
  };

  const handleDispatch = async () => {
    setBusy(true);
    try {
      saveEmailChannelPref(selectedChannel);
      if (selectedChannel === 'outlook_desktop') {
        const fname = await downloadOutlookDesktopEmlDraft({
          to: toEmail,
          cc: ccEmail,
          subject,
          bodyText,
          project,
          eng,
          standards,
          logoDataUrl
        });
        onStatusNotice(
          `Downloaded "${fname}" with pre-attached workbook & PDF — open in Outlook Desktop to review & send.`
        );
      } else if (selectedChannel === 'outlook_web') {
        const zipName = await launchCorporateOutlookWeb({
          to: toEmail,
          cc: ccEmail,
          subject,
          bodyText,
          project,
          eng,
          standards,
          logoDataUrl
        });
        onStatusNotice(
          `Opened Corporate Outlook Web & downloaded "${zipName}" for attachment.`
        );
      } else if (selectedChannel === 'gmail') {
        const msg = await launchGmailComposeOrDraft({
          clientId,
          existingToken: driveToken,
          to: toEmail,
          cc: ccEmail,
          subject,
          bodyText,
          project,
          eng,
          standards,
          logoDataUrl
        });
        onStatusNotice(msg);
      } else {
        const msg = await shareProposalPackViaDevice({
          subject,
          bodyText,
          project,
          eng,
          standards,
          logoDataUrl
        });
        onStatusNotice(msg);
      }
      onClose();
    } catch (err: unknown) {
      onStatusNotice((err as Error)?.message || 'Could not prepare email package.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-950 font-black uppercase text-[10px]">
              One-Click Proposal Email & Bundle Dispatch
            </span>
            <h3 className="text-base font-bold navy-text mt-1 flex items-center gap-1.5">
              <Mail className="w-4 h-4 coral-text" />
              Email Proposal Pack — {project.name}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device-Aware Channel Selector (Remembered per Device) */}
        <div className="space-y-1.5">
          <div className="font-bold text-slate-700">
            Select Mail Client ({isMobile ? 'Mobile/Tablet Detected' : 'Desktop Detected'} • Remembered on This Device):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => chooseChannel('outlook_desktop')}
              className={`p-2.5 rounded-xl border text-left transition ${
                selectedChannel === 'outlook_desktop'
                  ? 'navy-bg text-white border-[#002870]'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold">Outlook Desktop (.EML Draft)</div>
              <div className="text-[10px] opacity-85 mt-0.5">
                Opens in Outlook client with .XLSX & .PDF pre-attached
              </div>
            </button>

            <button
              type="button"
              onClick={() => chooseChannel('outlook_web')}
              className={`p-2.5 rounded-xl border text-left transition ${
                selectedChannel === 'outlook_web'
                  ? 'navy-bg text-white border-[#002870]'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold">Corporate Outlook Web</div>
              <div className="text-[10px] opacity-85 mt-0.5">
                Opens Outlook on the Web + downloads Proposal_Pack.zip
              </div>
            </button>

            <button
              type="button"
              onClick={() => chooseChannel('gmail')}
              className={`p-2.5 rounded-xl border text-left transition ${
                selectedChannel === 'gmail'
                  ? 'navy-bg text-white border-[#002870]'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold">Gmail (Draft / Web)</div>
              <div className="text-[10px] opacity-85 mt-0.5">
                Creates Gmail draft if connected, else opens Gmail + .ZIP
              </div>
            </button>

            <button
              type="button"
              onClick={() => chooseChannel('share_sheet')}
              className={`p-2.5 rounded-xl border text-left transition ${
                selectedChannel === 'share_sheet'
                  ? 'navy-bg text-white border-[#002870]'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5" /> Device Share / .ZIP
              </div>
              <div className="text-[10px] opacity-85 mt-0.5">
                Hands Proposal_Pack.zip to mobile mail/share apps or downloads
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">To (Recipient Email)</label>
            <input
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="client.stakeholder@domain.com"
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cc (Optional)</label>
            <input
              type="email"
              value={ccEmail}
              onChange={e => setCcEmail(e.target.value)}
              placeholder="team@domain.com"
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Executive Summary Body</label>
          <textarea
            rows={6}
            value={bodyText}
            onChange={e => setBodyText(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-slate-300 font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleDispatch}
            disabled={busy}
            className="px-4 py-2 rounded-lg coral-bg text-white font-black shadow"
          >
            {busy ? 'Preparing Pack...' : 'Launch & Prepare Email Pack'}
          </button>
        </div>
      </div>
    </div>
  );
};

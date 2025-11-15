import { pdf } from '@react-pdf/renderer';
import { AssessmentPDF } from '@/components/pdf/assessment-pdf';
import { Assessment, Case } from '@shared/schema';

export function usePDFDownload() {
  const downloadAssessmentPDF = async (assessment: Assessment, caseData?: Case) => {
    try {
      // Generate the PDF blob
      const blob = await pdf(
        AssessmentPDF({ assessment, caseData })
      ).toBlob();

      // Create filename with assessment title and date
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const clientName = caseData?.clientName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown';
      const filename = `Assessment_${clientName}_${date}.pdf`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  };

  return {
    downloadAssessmentPDF,
  };
}
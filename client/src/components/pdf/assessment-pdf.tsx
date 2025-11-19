import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Assessment, Case } from '@shared/schema';

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 11,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '1 solid #e1e5e9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a202c',
  },
  subtitle: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  infoItem: {
    width: '45%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: '#718096',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2d3748',
    paddingBottom: 4,
    borderBottom: '1 solid #e2e8f0',
  },
  sectionContent: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#4a5568',
    textAlign: 'justify',
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  actionBullet: {
    width: 12,
    fontSize: 11,
    color: '#48bb78',
  },
  actionText: {
    flex: 1,
    fontSize: 11,
    color: '#4a5568',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#a0aec0',
    paddingTop: 10,
    borderTop: '1 solid #e2e8f0',
  },
  statusBadge: {
    backgroundColor: '#edf2f7',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 9,
    color: '#2d3748',
    alignSelf: 'flex-start',
  },
});

interface AssessmentPDFProps {
  assessment: Assessment;
  caseData?: Case;
}

export function AssessmentPDF({ assessment, caseData }: AssessmentPDFProps) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{assessment.title}</Text>
          <Text style={styles.subtitle}>
            Assessment Report • {caseData?.clientName || 'Unknown Client'}
          </Text>
          <Text style={styles.subtitle}>
            Generated on {formatDate(new Date().toISOString())}
          </Text>
        </View>

        {/* Assessment Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Assessment Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Created Date</Text>
              <Text style={styles.infoValue}>{formatDate(assessment.createdAt)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Template</Text>
              <Text style={styles.infoValue}>{assessment.template}</Text>
            </View>
            {assessment.assignedTo && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Assigned To</Text>
                <Text style={styles.infoValue}>Team Member</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, { 
                color: assessment.processingStatus === 'completed' ? '#38a169' : 
                       assessment.processingStatus === 'processing' ? '#d69e2e' : '#e53e3e' 
              }]}>
                {assessment.processingStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Assessment Summary - Only show if completed */}
        {assessment.processingStatus === 'completed' && (
          <>
            {/* Dynamic Sections */}
            {assessment.dynamicSections && (() => {
              // Define section display names and order
              const displayNames: Record<string, string> = {
                "overview": "Overview",
                "hygiene": "Hygiene",
                "homeenvironment": "Home Environment",
                "medicalhistory": "Medical History",
                "behaviour": "Behaviour",
                "personalcare": "Personal Care",
                "background": "Background",
                "whoandwhatisimportanttome": "Who and what is important to me",
                "interestsandhobbies": "Interests and Hobbies",
                "communication": "Communication",
                "eatinganddrinking": "Eating and Drinking",
                "endoflifeconsiderationsandmylastwishes": "End of life considerations and my last wishes",
                "allergies": "ALLERGIES",
                "keysafe": "Key Safe",
                "medicationsupport": "Medication Support",
                "religionpracticing": "Religion (Practicing)",
                "skinintegrity": "Skin integrity",
                "breathing": "Breathing",
                "emotional": "Emotional",
                "nutrition": "Nutrition",
                "traveling": "Traveling"
              };

              const templateOrder = [
                "overview", "hygiene", "homeenvironment", "medicalhistory",
                "behaviour", "personalcare", "background", "whoandwhatisimportanttome",
                "interestsandhobbies", "communication", "eatinganddrinking",
                "endoflifeconsiderationsandmylastwishes", "allergies", "keysafe",
                "medicationsupport", "religionpracticing", "skinintegrity", "breathing",
                "emotional", "nutrition", "traveling"
              ];

              // Sort sections by template order
              const sortedSections = Object.entries(assessment.dynamicSections)
                .sort(([keyA], [keyB]) => {
                  const indexA = templateOrder.indexOf(keyA.toLowerCase());
                  const indexB = templateOrder.indexOf(keyB.toLowerCase());
                  if (indexA === -1) return 1;
                  if (indexB === -1) return -1;
                  return indexA - indexB;
                });

              return sortedSections.map(([key, content]) => {
                const sectionTitle = displayNames[key.toLowerCase()] || key;
                if (!content) return null;

                return (
                  <View key={key} style={styles.section}>
                    <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                    <Text style={styles.sectionContent}>{content}</Text>
                  </View>
                );
              });
            })()}

            {/* Action Items */}
            {assessment.actionItems && assessment.actionItems.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Action Items</Text>
                {assessment.actionItems.map((item, index) => (
                  <View key={index} style={styles.actionItem}>
                    <Text style={styles.actionBullet}>•</Text>
                    <Text style={styles.actionText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Case Management System • Assessment Report • Page 1 of 1
        </Text>
      </Page>
    </Document>
  );
}
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Download, TrendingUp, Users, FileText, Calendar, Filter, Loader2, X } from "lucide-react";
import { Assessment, Case } from "@shared/schema";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

interface ReportData {
  title: string;
  timeRange: string;
  generatedAt: string;
  summary: Record<string, any>;
  trends?: Record<string, any>;
  breakdown?: Record<string, any>;
  performance?: Record<string, any>;
  insights?: Record<string, any>;
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
    borderBottom: 0.5,
    borderBottomColor: '#d1d5db',
    paddingBottom: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    color: '#4b5563',
    flex: 1,
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
    minWidth: 60,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  gridItem: {
    width: '48%',
    marginBottom: 5,
    marginRight: '2%',
  },
  performanceItem: {
    marginBottom: 4,
    paddingVertical: 2,
    borderBottom: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  noData: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

// PDF Document Component
const ReportPDF = ({ reportData }: { reportData: ReportData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{reportData.title}</Text>
        <Text style={styles.subtitle}>
          {reportData.timeRange} • Generated on {new Date(reportData.generatedAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.grid}>
          {Object.entries(reportData.summary).map(([key, value]) => (
            <View key={key} style={styles.gridItem}>
              <View style={styles.row}>
                <Text style={styles.label}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </Text>
                <Text style={styles.value}>
                  {typeof value === 'number' && key.includes('Rate') ? `${value}%` : String(value)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Trends Section */}
      {reportData.trends && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends & Analytics</Text>
          
          {reportData.trends.statusBreakdown && (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Status Distribution</Text>
              {reportData.trends.statusBreakdown.map((item: any) => (
                <View key={item.status} style={styles.row}>
                  <Text style={styles.label}>{item.status}:</Text>
                  <Text style={styles.value}>{item.count} ({item.percentage}%)</Text>
                </View>
              ))}
            </View>
          )}

          {reportData.trends.weeklyActivity && (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Weekly Activity</Text>
              {reportData.trends.weeklyActivity.map((item: any) => (
                <View key={item.week || item.period} style={styles.row}>
                  <Text style={styles.label}>{item.week || item.period}:</Text>
                  <Text style={styles.value}>{item.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Performance Section */}
      {reportData.performance && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          
          {reportData.performance.userPerformance && (
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>User Performance</Text>
              {reportData.performance.userPerformance.slice(0, 10).map((user: any) => (
                <View key={user.name} style={styles.performanceItem}>
                  <View style={styles.row}>
                    <Text style={styles.label}>{user.name}</Text>
                    <Text style={styles.value}>{user.completed}/{user.total} ({user.completionRate}%)</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Breakdown Section */}
      {reportData.breakdown && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
          
          {reportData.breakdown.assignmentBreakdown && (
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Case Assignments</Text>
              {reportData.breakdown.assignmentBreakdown.slice(0, 10).map((user: any) => (
                <View key={user.name} style={styles.performanceItem}>
                  <View style={styles.row}>
                    <Text style={styles.label}>{user.name}</Text>
                    <Text style={styles.value}>Active: {user.activeCases} | Total: {user.totalCases}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Insights Section */}
      {reportData.insights && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          {Object.entries(reportData.insights).map(([key, value]: [string, any]) => {
            if (!value) return null;
            return (
              <View key={key} style={{ marginBottom: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </Text>
                <Text style={{ fontSize: 10, marginLeft: 10 }}>
                  {value.name}
                  {value.activeCases && ` (${value.activeCases} active cases)`}
                  {value.completedCases && ` • ${value.completedCases} completed`}
                  {value.totalCases && ` • ${value.totalCases} total`}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Footer */}
      <View style={{ position: 'absolute', bottom: 30, left: 30, right: 30, borderTop: 0.5, borderTopColor: '#e5e7eb', paddingTop: 10 }}>
        <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center' }}>
          CloudnotesAI • Generated on {new Date().toLocaleString()}
        </Text>
      </View>
    </Page>
  </Document>
);

export default function Reports() {
  const [timeRange, setTimeRange] = useState("30");
  const [reportType, setReportType] = useState("all");
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: assessments } = useQuery({
    queryKey: ["/api/assessments"],
  });

  const { data: cases } = useQuery({
    queryKey: ["/api/cases"],
  });

  const assessmentList = (assessments as Assessment[] || []);
  const caseList = (cases as Case[] || []);

  // Calculate statistics
  const completedAssessments = assessmentList.filter(a => a.processingStatus === 'completed').length;
  const activeCases = caseList.filter(c => c.status === 'active').length;
  const totalAssessments = assessmentList.length;

  // Calculate recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentAssessments = assessmentList.filter(a => 
    new Date(a.createdAt) >= thirtyDaysAgo
  ).length;

  // Report generation mutations
  const generateOverviewReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/reports/overview?timeRange=${timeRange}`);
      return await response.json();
    },
    onSuccess: (data: ReportData) => {
      setSelectedReport(data);
      setIsReportModalOpen(true);
      toast({
        title: "Report Generated",
        description: "Assessment Overview Report has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate overview report. Please try again.",
      });
      console.error("Error generating overview report:", error);
    },
  });

  const generateCasesReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/reports/cases?timeRange=${timeRange}`);
      return await response.json();
    },
    onSuccess: (data: ReportData) => {
      setSelectedReport(data);
      setIsReportModalOpen(true);
      toast({
        title: "Report Generated",
        description: "Case Management Report has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate case management report. Please try again.",
      });
      console.error("Error generating case management report:", error);
    },
  });

  const handleGenerateReport = (reportId: string) => {
    if (reportId === "overview") {
      generateOverviewReportMutation.mutate();
    } else if (reportId === "cases") {
      generateCasesReportMutation.mutate();
    }
  };

  const reportCategories = [
    {
      id: "overview",
      name: "Assessment Overview Report",
      description: "Summary of all assessments with completion rates and trends",
      icon: BarChart3,
      status: "available"
    },
    {
      id: "cases",
      name: "Case Management Report", 
      description: "Detailed breakdown of cases, their status, and assessment history",
      icon: Users,
      status: "available"
    }
  ];

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 md:pl-16 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground">Analytics and insights for your care assessments</p>
          </div>
          <Button 
            data-testid="button-export-reports"
            onClick={async () => {
              try {
                // Generate both reports and export them as PDFs
                toast({
                  title: "Generating Reports",
                  description: "Preparing all available reports for export...",
                });

                // Generate Assessment Overview Report
                const overviewReport = await generateOverviewReportMutation.mutateAsync();
                
                // Generate Case Management Report  
                const casesReport = await generateCasesReportMutation.mutateAsync();

                // Export Assessment Overview PDF
                const overviewPdfDoc = <ReportPDF reportData={overviewReport} />;
                const overviewPdfBlob = await pdf(overviewPdfDoc).toBlob();
                const overviewUrl = URL.createObjectURL(overviewPdfBlob);
                const overviewLink = document.createElement('a');
                overviewLink.href = overviewUrl;
                overviewLink.download = `Assessment_Overview_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(overviewLink);
                overviewLink.click();
                document.body.removeChild(overviewLink);
                URL.revokeObjectURL(overviewUrl);

                // Wait a moment then export Case Management PDF
                setTimeout(async () => {
                  const casesPdfDoc = <ReportPDF reportData={casesReport} />;
                  const casesPdfBlob = await pdf(casesPdfDoc).toBlob();
                  const casesUrl = URL.createObjectURL(casesPdfBlob);
                  const casesLink = document.createElement('a');
                  casesLink.href = casesUrl;
                  casesLink.download = `Case_Management_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                  document.body.appendChild(casesLink);
                  casesLink.click();
                  document.body.removeChild(casesLink);
                  URL.revokeObjectURL(casesUrl);
                }, 500);

                toast({
                  title: "Reports Exported",
                  description: "Both Assessment Overview and Case Management reports have been downloaded as PDFs.",
                });
              } catch (error) {
                console.error('Error exporting reports:', error);
                toast({
                  variant: "destructive",
                  title: "Export Error",
                  description: "Failed to generate and export reports. Please try again.",
                });
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Reports
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 space-y-6">
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-muted rounded-lg">
          <Filter className="hidden sm:block h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">Time Range:</span>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">Report Type:</span>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="assessments">Assessments Only</SelectItem>
                <SelectItem value="cases">Cases Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                  <p className="text-2xl font-bold text-foreground">{totalAssessments}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-foreground">{completedAssessments}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-2xl font-bold text-foreground">{activeCases}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
                  <p className="text-2xl font-bold text-foreground">{recentAssessments}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Types */}
        <div>
          <h2 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">Available Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {reportCategories.map((report) => {
              const IconComponent = report.icon;
              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                      </div>
                      <Badge variant={report.status === 'available' ? 'default' : 'secondary'}>
                        {report.status === 'available' ? 'Available' : 'Coming Soon'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {report.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {report.status === 'available' ? (
                        <>
                          <Button 
                            size="sm" 
                            data-testid={`button-generate-${report.id}`}
                            onClick={() => handleGenerateReport(report.id)}
                            disabled={generateOverviewReportMutation.isPending || generateCasesReportMutation.isPending}
                          >
                            {(report.id === "overview" && generateOverviewReportMutation.isPending) || 
                             (report.id === "cases" && generateCasesReportMutation.isPending) ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              "Generate Report"
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Available Soon
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Report Information */}
        <Card>
          <CardHeader>
            <CardTitle>About Reports</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              Reports provide comprehensive insights into your care assessments, case management, and organizational performance. 
              Use these analytics to track trends, ensure compliance, and optimize your care delivery processes.
            </p>
            
            <div className="mt-4">
              <h4 className="font-medium text-foreground mb-2">Report Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Real-time data analysis and visualization</li>
                <li>• Customizable time ranges and filtering options</li>
                <li>• Export functionality for external analysis</li>
                <li>• Scheduled report generation and delivery</li>
                <li>• Compliance tracking and quality metrics</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Report Display Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedReport?.title}
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              {selectedReport?.timeRange} • Generated on {selectedReport?.generatedAt ? new Date(selectedReport.generatedAt).toLocaleDateString() : ''}
            </div>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              {/* Summary Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(selectedReport.summary).map(([key, value]) => (
                    <Card key={key} className="p-4">
                      <div className="text-sm text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-2xl font-bold">
                        {typeof value === 'number' && key.includes('Rate') ? `${value}%` : value}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Trends Section */}
              {selectedReport.trends && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Trends & Analytics</h3>
                  <div className="space-y-4">
                    {selectedReport.trends.statusBreakdown && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-3">Status Distribution</h4>
                        <div className="space-y-2">
                          {selectedReport.trends.statusBreakdown.map((item: any) => (
                            <div key={item.status} className="flex items-center justify-between">
                              <span className="text-sm">{item.status}</span>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium">{item.count}</div>
                                <div className="text-xs text-muted-foreground">({item.percentage}%)</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                    
                    {selectedReport.trends.weeklyActivity && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-3">Weekly Activity</h4>
                        <div className="space-y-2">
                          {selectedReport.trends.weeklyActivity.map((item: any) => (
                            <div key={item.week || item.period} className="flex items-center justify-between">
                              <span className="text-sm">{item.week || item.period}</span>
                              <div className="text-sm font-medium">{item.count}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Section */}
              {selectedReport.performance && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-medium mb-3">Performance</h3>
                    <div className="space-y-4">
                      {selectedReport.performance.userPerformance && (
                        <Card className="p-4">
                          <h4 className="font-medium mb-3">User Performance</h4>
                          <div className="space-y-2">
                            {selectedReport.performance.userPerformance.slice(0, 5).map((user: any) => (
                              <div key={user.name} className="flex items-center justify-between">
                                <span className="text-sm">{user.name}</span>
                                <div className="flex items-center gap-4">
                                  <div className="text-xs text-muted-foreground">
                                    {user.completed}/{user.total}
                                  </div>
                                  <div className="text-sm font-medium">{user.completionRate}%</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Breakdown Section (for case reports) */}
              {selectedReport.breakdown && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-medium mb-3">Detailed Breakdown</h3>
                    <div className="space-y-4">
                      {selectedReport.breakdown.assignmentBreakdown && (
                        <Card className="p-4">
                          <h4 className="font-medium mb-3">Case Assignments</h4>
                          <div className="space-y-2">
                            {selectedReport.breakdown.assignmentBreakdown.slice(0, 5).map((user: any) => (
                              <div key={user.name} className="flex items-center justify-between">
                                <span className="text-sm">{user.name}</span>
                                <div className="flex items-center gap-4">
                                  <div className="text-xs text-muted-foreground">
                                    Active: {user.activeCases}
                                  </div>
                                  <div className="text-sm font-medium">Total: {user.totalCases}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Insights Section */}
              {selectedReport.insights && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-medium mb-3">Key Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedReport.insights).map(([key, value]: [string, any]) => {
                        if (!value) return null;
                        return (
                          <Card key={key} className="p-4">
                            <div className="text-sm text-muted-foreground capitalize mb-1">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="font-medium">{value.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {value.activeCases && `${value.activeCases} active cases`}
                              {value.completedCases && ` • ${value.completedCases} completed`}
                              {value.totalCases && ` • ${value.totalCases} total`}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={async () => {
                  if (!selectedReport) return;
                  
                  try {
                    // Generate PDF
                    const pdfDoc = <ReportPDF reportData={selectedReport} />;
                    const pdfBlob = await pdf(pdfDoc).toBlob();
                    
                    // Create download link
                    const url = URL.createObjectURL(pdfBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Clean up
                    URL.revokeObjectURL(url);
                    
                    toast({
                      title: "Report Exported",
                      description: `${selectedReport.title} has been downloaded as PDF successfully.`,
                    });
                  } catch (error) {
                    console.error('Error generating PDF:', error);
                    toast({
                      variant: "destructive",
                      title: "Export Error",
                      description: "Failed to generate PDF. Please try again.",
                    });
                  }
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
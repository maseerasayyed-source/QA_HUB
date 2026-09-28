// Pre-trained Beacon Treasury Master Domain Knowledge & Real QA Test Cases from Maseera Sayyed

export interface BeaconTrainedTestCase {
  testCaseId: string;
  testModule: string;
  featureTab: string;
  testScenario: string;
  testCases: string;
  testInputs: string;
  expectedResult: string;
  actualResult: string;
  status: string;
}

export const BEACON_ARCHITECTURE_BLUEPRINT = `
BEACON TREASURY MANAGEMENT SYSTEM (TMS) USER MANUAL 1.0 — COMPLETE PRODUCT ARCHITECTURE & QA STANDARDS (Trained from Official Beacon User Manual & Maseera Sayyed's QA Suites):

1. GLOBAL SYSTEM ARCHITECTURE, NAVIGATION & ACCESS CONTROL:
   - Main Navigation Modules: Dashboard, Masters, Sanction, Borrowings, Investments, Hedge / Derivatives, Security & Collateral, Accounting & Ledger, Reports, Settings / User Administration.
   - Maker-Checker (Input vs. Authorize) & Role Rights:
     • Role separation between "Input Access Rights" (Maker: Add, Edit, Bulk Import, Initiate Action) and "Authorization Access Rights" (Checker: Authorize, Reject, Bulk Authorize).
     • Users without input rights are restricted from creating/editing deals or performing Bulk Import; users with input-only rights are restricted from authorizing deals.
     • Status Lifecycle: Pending Authorization -> Authorized / Rejected -> Closed / Matured / Cancelled.
     • Dependency Enforcement: Transactions in "Pending Authorization" status enforce strict dependency locks (e.g., cannot perform Split Out if first investment transaction is Pending Authorization; if a Redemption is Pending Authorization, post-split authorization is blocked if it results in a negative unit balance).
   - Undo Action & History Synchronization:
     • Available in Transaction History and Master History to revert the last action.
     • Cascading Undo: Undoing a linked transaction (such as Mutual Fund Split-In from Transaction History) automatically reverts the corresponding Split-Out transaction (and vice versa) to keep both deals synchronized. Undoing a GL Code update in GL Master removes the reverted GL Code from accounting.

2. STANDARD BULK IMPORT / BULK UPLOAD ARCHITECTURE (ALL MODULES):
   - Standard Bulk Import UI controls: "Browse / Upload", "Save Sample" (generates standard Excel template with proper column headers and sample entries without any client-specific names/data), and "Accept" button.
   - Strict Row 5 / Row 6 Excel Format Rule:
     • Column headers MUST start from the 5th row (Row 5).
     • Deal / Master data MUST start from the 6th row (Row 6).
     • Header mapping is positional (mapped by defined column number and row position — Row 5 headers, Row 6 data) even if header label text in Excel differs slightly from UI field names.
   - Date, Mandatory & Duplicate Validations:
     • Deals or files with dates beyond the Server Date / System Date (future settlement/upload dates) are blocked with a clear validation message.
     • Rows missing mandatory fields (e.g., Trade No., Settlement Date, Maturity Date, Trade Interest Rate %, Trade Value) are rejected and not accepted on Bulk Import UI.
     • Duplicate identifiers (e.g., existing Trade No.) or cross-sheet mismatches (e.g., Sanction Reference mismatch between Basic Details, Main Break-up, and Sub Break-up sheets) are rejected with specific validation errors.

3. MASTERS MODULE (BEACON USER MANUAL SECTION — MASTERS):
   - Home Entity & Counterparty Master:
     • Captures Entity/Counterparty Type (Bank, NBFC, AMC, Broker, Corporate, Clearing Corporation/CCIL, Trustee, Rating Agency), PAN, TAN, LEI, 15-digit GSTIN (validated for format & state code), and contact/settlement details.
   - Bank Account Master & Bank Balance Master:
     • Bank Account Master links Bank Name, Branch, IFSC, Account No., Account Type (Current, CC/OD, Escrow, Tracking-Purpose Only), and Home Entity.
     • Bank Balance Master displays header "Actual Closing Balance" and supports manual entry and Bulk Import from an Effective Date.
     • Tracking-purpose bank accounts allow updating positive balances only; negative bank balances are strictly restricted with a validation message.
     • CC/OD linked bank accounts restrict negative balances if no CC/OD deal is linked, after sanction validity expires, or beyond the sanctioned limit; on the sanction validity expiry date, closing balance must be 0 or positive.
   - Benchmark / Index Rate Master:
     • Stores MCLR (1M/3M/6M/1Y), Repo Rate, T-Bill, SOFR, MIBOR rates by Effective Date. Updating a benchmark rate dynamically recalculates Effective Rate (Benchmark + Spread) across floating-rate deals on their reset schedule.
   - Security / ISIN Master & NAV Master:
     • Stores 12-character ISIN, Instrument Type (MF, G-Sec, SDL, T-Bill, NCD/Bond, CP, CD), Issuer/AMC, Face Value, Coupon Rate, Issue/Maturity Dates, Day Count Convention (Actual/365, Actual/Actual, 30/360), and daily NAV / Clean & Dirty Market Prices.

4. SANCTION MODULE (SANCTION MASTER, ECB SANCTION, INITIATE ACTION & BULK UPLOAD):
   - Currency Field Rules:
     • "Currency" field is visible and editable ONLY for ECB (External Commercial Borrowing) instrument in Sanction Master; non-editable for all domestic instruments and non-editable in Fungible Sanctions even for ECB.
     • Adding multiple break-ups with different currencies under the same Sanction Reference is strictly restricted (both during creation and under Initiate Action -> Update Sanction / Renew Sanction).
   - Main Break-up & Sub Break-up Rules:
     • "Has Sub Limit" checkbox is non-editable (locked to NO) in ECB main break-up.
     • When "Has Sub Limit" is set to NO, adding details in the Sub Break-up section/sheet throws a validation error.
     • Sub Break-up Availability Date cannot be greater than Main Break-up Availability Date.
   - Sanction Facility ID Visibility & Utilization Validation:
     • If Sanction is created in FCY, Facility ID is visible ONLY when the deal currency matches the Sanction FCY. If Sanction is in INR, Facility ID is visible for all deals irrespective of deal currency.
     • FCY Sanction + FCY Deal: Utilization is validated directly on FCY drawdown amount without INR conversion.
     • INR Sanction + FCY Deal: Utilization is calculated and validated as (FCY Drawdown * Conversion Rate) = INR Amount against the INR Sanction Limit.
     • Cumulative utilization is tracked across multiple deals under the same Sanction Facility ID; drawdown cannot exceed available sanction, and when available sanction reaches 0, the sanction cannot be used in another deal.
   - Sanction Initiate Actions ("Update Sanction", "Renew Sanction", "Add Deviation", "Change Disbursement Schedule"):
     • During Update Sanction or Renew Sanction, the system restricts changing the Currency and prevents reducing the Sanction Amount below the already utilized amount.
     • Add Deviation and Change Disbursement Schedule enforce available sanction limit checks (blocking when available balance is 0) and require Repayment Amount to match Disbursement Amount (cannot be greater or less).
   - Sanction Report:
     • Displays "Currency" column with proper header naming and calculates "Principal O/S in INR" using the applicable conversion rate.

5. BORROWINGS MODULE (BEACON USER MANUAL SECTION — BORROWINGS):
   - Term Loan (TL) & Short Term Loan (STL):
     • Covers Deal Booking, Tranche Disbursement Schedule, Interest Parameters (Fixed/Floating, Benchmark + Spread, Reset Frequency, Moratorium), Repayment Schedule (EMI, Equal Principal, Bullet, Custom), Fees & GST, Cashflow, and Initiate Actions (Disbursement, Rate Reset, Prepayment/Foreclosure, Add Deviation, Change Disbursement Schedule, Autopay).
     • Penalty & Overdue Rules: Penalty entries (penalty interest %, penalty principal %) appear in Deal Cashflow and Overdue Report ONLY when overdue occurs AFTER loan disbursement AND default/penalty rate > 0. Without loan disbursement (or when penalty rate is 0 / blank), no penalty entries are generated.
     • Autopay Overdue Report Rule: Deals under Autopay do NOT appear in the Overdue Report during the active Autopay period; once the Autopay period ends, any subsequent overdue appears in the Overdue Report with applicable penalty entries.
   - Working Capital Demand Loan (WCDL):
     • Sub-limit drawdown under Sanction/CC limit, short-term tenure, rollover/renewal at maturity, bullet or periodic interest settlement.
   - Cash Credit (CC) & Overdraft (OD):
     • CC Bank Account dropdown on Deal UI displays ONLY Home Entity bank accounts belonging to the selected Lender Bank.
     • Closing balances updated in Bank Balance Master (manual or bulk import) reflect from the same Effective Date in Deal Cashflow, ALM Treasury Report, and Borrowing Register Report, and daily interest calculation starts from that date.
   - External Commercial Borrowing (ECB):
     • Multi-currency (FCY) borrowing, LRN tracking, Conversion Rate validation against FCY/INR Sanctions, Withholding Tax (WHT), Hedged/Unhedged tracking.
   - Commercial Paper (CP) & Non-Convertible Debentures (NCD) Borrowing:
     • CP issued at discount to Face Value, IPA & rating details, discount amortization, redemption at par.
     • NCD series/tranche booking, ISIN, Coupon Schedule (Fixed/Floating/Zero Coupon), Put/Call options, Debenture Trustee, TDS, and redemption schedule.
   - TREPS Borrowing & Letter of Credit (LC) / Bank Guarantee (BG):
     • TREPS Borrowing tracks 1st Leg borrowed amount, Repo Rate, Tenure, Total Interest, 2nd Leg settlement, collateral basket, and dedicated TREPS Borrowing GL Codes.
     • LC/BG tracks issuance under non-fund sanction limits, usance/sight terms, margin FD lien, commission/charges, amendments, and invocation/closure.

6. INVESTMENTS MODULE (BEACON USER MANUAL SECTION — INVESTMENTS):
   - Mutual Fund (MF) Investment:
     • Supports Purchase/Investment, Redemption (FIFO unit allocation & Capital Gains), Switch, MF Modification, and Split Action (Split Out / Split In) under "Initiate Action".
     • MF Split Action Rules:
       - Visible and editable under Initiate Action; accepts Ratio (New:Old) for ISIN split.
       - "Split Out From" dropdown displays ONLY schemes belonging to the same AMC and matching Plan, Option, and Fund Name as the selected Split In deal.
       - Split In deal must have NO previous transactions before performing Split Action.
       - Value Date in Split Out is validated against Transaction Date; Value Date in Split In is auto-fetched from the Split Out transaction.
       - System calculates Split In Units and new ISIN NAV based on the applied split ratio, updating Investment Holding Details, Transaction History, and Holding Summary (Total Units, Average Purchase NAV, Total Investment Amount, Current Market Value, Unrealised/Realised P&L, XIRR).
       - Post-Split Action availability: After all units are Split Out, ONLY "MF Modification" is available under Initiate Action (Investment, Redemption, Switch hidden); Split Action option is removed once Split In is completed on a deal.
   - Fixed Deposit (FD) Investment:
     • Supports Placement, Periodic Interest Accrual/Receipt, FD Lien Marking, Premature Closure, FD End (Maturity/Closure), and FD Rollover under both Coupon Interest Payment and Bullet Interest Payment modes.
     • FD Rollover & FD End TDS Accounting Rules:
       - In Coupon Interest Payment mode (FD End & FD Rollover), TDS is deducted on the coupon payout and reflected in accounting vouchers (Debit Interest/Accrual, Credit Bank/Rollover, Credit TDS Payable GL), while Rollover commences with original principal.
       - In Bullet Interest Payment mode (FD End & FD Rollover), TDS is calculated on cumulative gross interest; for Bullet Rollover, net proceeds (Original Principal + Net Interest after TDS) roll over into the new FD deal with balanced GL postings.
   - Government Securities (G-Sec / T-Bill / SDL), Corporate Bonds (NCD) & Commercial Paper (CP) Investments:
     • G-Sec Investment Purpose (SLR, LCR, Investment, Lien, Other) maps to dedicated purpose-specific GL Codes in accounting.
     • Tracks Clean Price, Broken Period / Accrued Interest, Dirty Price, YTM, Coupon Receipts, HTM/AFS/HFT classification, MTM valuation, and Secondary Market Sale/Redemption.
   - TREPS Investment (Lending):
     • Bulk Import & Deal UI validate mandatory fields: Trade No., Maturity Date, Settlement Date, Trade Interest Rate (%), Trade Value (Rs.).
     • Field Mapping & Calculations: 1 Leg Consideration (Principal) = Trade Value in Excel; Trade Interest Rate (%) = Repo Rate in Excel; Reversal Date for Lend = Maturity Date in Excel; accurately calculates Tenure, Settlement Type, Total Interest, and 2-Leg Consideration (Principal + Interest).

7. HEDGE / DERIVATIVES, SECURITY & COLLATERAL, ACCOUNTING & REPORTS MODULES:
   - Hedge & Derivatives:
     • FX Forward, Cross Currency Swap (CCS), Interest Rate Swap (IRS), and Options linked to underlying ECB/Trade exposures; supports Utilization, Early Delivery, Rollover, Cancellation, and MTM valuation.
   - Security & Collateral:
     • Tracks Hypothecation, Mortgage, Pledge, FD Lien, Asset Cover Ratio (ACR), ROC Charge filings, and security mapping to Sanction/Borrowing deals.
   - Accounting & Global Accounting Code Master (GL Master):
     • Newly added GL Code fields in Global Accounting Code Master must be editable and reflected in Deal-wise Accounting.
     • Effective Date Rule: Accounting entries reflect updated GL Codes based on the date the GL Code was updated in GL Master.
     • Old Branch Compatibility Rule: Deals whose accounting entries were already generated and saved on an old branch must NOT generate duplicate accounting entries or reversal entries.
     • Balanced double-entry vouchers (Debit = Credit) are generated across all instruments (G-Sec by Purpose, Bond/NCD, FD, CP, TREPS Investment, TREPS Borrowing, Term Loan, CC/OD, MF).
   - Reports Module:
     • Daily Cash Flow MIS Report: "Short Capitalized Interest Payment" flag (when checked, includes applicable short capitalized interest in Running Balance) and "Capitalized Interest Payment" flag (when unchecked and interest is unprocessed, excludes unprocessed interest from summary and calculates Running Balance solely from processed transactions).
     • Overdue Report, Autopay Overdue Report, Sanction Report, Borrowing Register Report, Investment Register Report, ALM Treasury Report.

8. MASEERA SAYYED'S EXACT QA WRITING STYLE:
   - Test Scenario: Starts with "Validate ..." or "Verify ..." — clear, specific functional condition naming the exact Beacon workflow.
   - Test Cases: Starts with "Verify that ..." (or "Ensure that ...") naming the exact Beacon screen, tab, dropdown, flag, or report.
   - Expected Result: Direct specification statements ("The system should ...", "System should restrict / allow ... and display an appropriate validation message.").
   - Actual Result: Clear confirmation matching Expected Result ("The system prevents ... and displays the appropriate validation message.").
`;

export const BEACON_TRAINED_TEST_CASES: BeaconTrainedTestCase[] = [
  // 1. Term Loan — Penalty, Cashflow, Overdue Report & Autopay Overdue Report
  {
    testCaseId: 'TC01',
    testModule: 'Term Loan',
    featureTab: 'penalty',
    testScenario: 'Penalty entries appear in the cashflow when overdue occurs after loan disbursement.',
    testCases: 'Verify that penalty is applied and displayed in cashflow when interest or principal becomes overdue after disbursement.',
    testInputs: 'TL-23-24-00001, penalty interest - 10%, penalty principal - 10%',
    expectedResult: 'The cashflow should display the deal with penalty entries whenever overdue occurs on interest or principal after loan disbursement.',
    actualResult: 'The cashflow is displaying the deal with penalty entries.',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'Term Loan',
    featureTab: 'penalty',
    testScenario: 'Penalty entries are not displayed in the cashflow without loan disbursement.',
    testCases: 'Verify that penalty is not applied and displayed in cashflow when interest or principal becomes overdue without disbursement.',
    testInputs: 'TL-24-25-00002, penalty interest - 10%, penalty principal - 10%',
    expectedResult: 'If no disbursement has occurred, penalty entries should not be displayed in Cashflow.',
    actualResult: 'Penalty entries are not being displayed in cashflow.',
    status: 'pass',
  },
  {
    testCaseId: 'TC03',
    testModule: 'Term Loan',
    featureTab: 'overdue report',
    testScenario: 'After disbursement, overdue deals appear in the overdue report with penalty entries.',
    testCases: 'Verify that penalty is applied and reflected in the overdue report when interest or principal becomes overdue after disbursement.',
    testInputs: 'TL-24-25-00002, penalty interest - 10%, penalty principal - 10%',
    expectedResult: 'The overdue report should display the deal with penalty entries, whenever there is an overdue on interest or principal after loan disbursement.',
    actualResult: 'The overdue report correctly displays the deal with penalty entries.',
    status: 'pass',
  },
  {
    testCaseId: 'TC04',
    testModule: 'Term Loan',
    featureTab: 'overdue report',
    testScenario: 'No disbursement, deal appears in the overdue report without penalty entries.',
    testCases: 'Verify that if no disbursement has been made, then the deal should not appear in the overdue report.',
    testInputs: 'TL-24-25-00002, penalty interest - 10%, penalty principal - 10%',
    expectedResult: 'When no disbursement is done, the deal should not be displayed in the overdue report, and no penalty entries should be shown.',
    actualResult: 'The deal is not displayed in the overdue report, and no penalty entries are shown.',
    status: 'pass',
  },
  {
    testCaseId: 'TC05',
    testModule: 'Term Loan',
    featureTab: 'Autopay overdue report',
    testScenario: 'Deal under autopay until 31st March 2024, not visible in overdue report; after autopay ends, if overdue occurs, deal appears in overdue report with penalty entries.',
    testCases: 'Verify that the deal does not appear in the overdue report during the autopay period, and after the autopay ends, if overdue occurs, the deal appears in the overdue report with penalty entries.',
    testInputs: 'TL-23-24-00004, penalty interest - 10%, penalty principal - 10%',
    expectedResult: 'For a deal under autopay until 31st March 2024, Deal does not appear in the overdue report till the autopay period ends. Once the autopay period ends, the deal should appear in the overdue report, and Penalty entries are displayed only for overdues occurring after the autopay period.',
    actualResult: 'The deal appears in the overdue report after 31st March 2024, and penalty entries are shown only for overdues occurring after the autopay period.',
    status: 'pass',
  },
  {
    testCaseId: 'TC06',
    testModule: 'Term Loan',
    featureTab: 'penalty',
    testScenario: 'Default interest/principal rate is not entered, penalty not displayed in cashflow/overdue report when overdue occurs.',
    testCases: 'Verify that when default interest/principal rate is not entered, penalty is not displayed in the cashflow/overdue report when overdue occurs, irrespective of whether disbursement has been made or not.',
    testInputs: 'TL-23-24-00008, penalty interest - 0, penalty principal - 0',
    expectedResult: 'Penalty entries should not be generated when an overdue occurs and no default/penalty rate is defined.',
    actualResult: 'No penalty entries were generated when the overdue occurred, as no default/penalty rate was defined.',
    status: 'pass',
  },

  // 2. TREPS Investment — Bulk Import
  {
    testCaseId: 'TC01',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Attempt to import a .csv/.xlsx file in the prescribed format.',
    testCases: 'Verify that a user with investment input access rights is able to successfully import the file.',
    testInputs: 'data given by client',
    expectedResult: 'Imported deals should be displayed on the Bulk Import UI with all mandatory columns and entries populated correctly.',
    actualResult: 'Deals are displayed properly on the Bulk Import UI with correct columns and entries.',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Accept the imported sheet/datafile using the Accept button on the Bulk Import UI.',
    testCases: 'Verify that deals displayed on the Bulk Import UI are accepted without errors, and invalid deals are handled appropriately.',
    testInputs: 'data given by client',
    expectedResult: 'Deals with correct entries should be accepted successfully. If any deal has incorrect data, the system should not accept it and should display the proper error message.',
    actualResult: 'Deals with correct entries are accepted, while invalid deals are not accepted and appropriate error messages are shown.',
    status: 'pass',
  },
  {
    testCaseId: 'TC03',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate Excel file format for bulk import.',
    testCases: 'Verify that in the Excel/bulk import file: Column headers should start from the 5th row. Deal data should start from the 6th row. If this format is not followed, the deal should not be accepted in the bulk import UI.',
    testInputs: 'data given by client',
    expectedResult: 'Deals should only be accepted if the column headers begin from row 5 and the data begins from row 6. Any deviation from this format should result in rejection with an appropriate error message.',
    actualResult: 'Column headers and deal data were in the correct rows (5th and 6th respectively). Deals were accepted successfully as per the required format.',
    status: 'pass',
  },
  {
    testCaseId: 'TC04',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate header mapping based on column/row position during bulk import.',
    testCases: 'Verify that even if the header text in the Excel/bulk import file does not exactly match the UI field names, the system should correctly identify and fetch the data based on the defined column number and row position (headers at row 5, data starting from row 6).',
    testInputs: 'data given by client',
    expectedResult: 'The system should fetch and map data correctly from the Excel file to the UI fields using the column/row positions, even if header text differs.',
    actualResult: 'Data was fetched and mapped correctly from the Excel file to the UI fields based on column/row positions, even though header text did not exactly match.',
    status: 'pass',
  },
  {
    testCaseId: 'TC05',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Use the Save Sample option to generate a sample import file.',
    testCases: 'Verify that using Save Sample generates a file in the correct format without specific client names or client data.',
    testInputs: 'data given by client',
    expectedResult: 'The file should be saved with proper column headers, no client-specific names/data, and only a few sample entries for reference.',
    actualResult: 'The file should be saved with proper column headers, no client-specific names/data, and only a few sample entries.',
    status: 'pass',
  },
  {
    testCaseId: 'TC06',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate deal acceptance based on settlement date.',
    testCases: 'Verify that a deal with a settlement date in the future is not accepted when the system date is 01-Jan-2025.',
    testInputs: 'data given by client',
    expectedResult: 'Deals with a future settlement date should be rejected, and an appropriate error message should be displayed.',
    actualResult: 'Deals with a future settlement date were correctly rejected, and the system displayed the appropriate error message.',
    status: 'pass',
  },
  {
    testCaseId: 'TC07',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Prevent importing deals/files beyond the server date and display proper error message.',
    testCases: 'Verify that deals or files with a date later than the server date are not imported.',
    testInputs: 'data given by client',
    expectedResult: 'The system should block the import and display a clear, proper error message indicating that the deal/file date cannot be beyond the server date.',
    actualResult: 'The system blocked the import and displayed the proper error message successfully.',
    status: 'pass',
  },
  {
    testCaseId: 'TC08',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate mandatory field "Trade No" during bulk import.',
    testCases: 'Verify that any row in the Excel file with a blank Trade No. is not displayed on the Bulk Import UI.',
    testInputs: 'data given by client',
    expectedResult: 'Rows with blank Trade No should be rejected, and an appropriate error message should be shown.',
    actualResult: 'Rows with blank Trade No were rejected, and the error message was displayed correctly.',
    status: 'pass',
  },
  {
    testCaseId: 'TC09',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate mandatory field "Maturity Date" during bulk import.',
    testCases: 'Verify that any row in the Excel file missing the Maturity Date is not displayed on the Bulk Import UI.',
    testInputs: 'data given by client',
    expectedResult: 'Rows without a Maturity Date should be rejected, and an appropriate error message should be displayed.',
    actualResult: 'Rows missing the Maturity Date were correctly rejected, and the proper error message was shown.',
    status: 'pass',
  },
  {
    testCaseId: 'TC10',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate mandatory field "Settlement Date" during bulk import.',
    testCases: 'Verify that any row in the Excel file missing the Settlement Date is not displayed on the Bulk Import UI.',
    testInputs: 'data given by client',
    expectedResult: 'Rows without a Settlement Date should be rejected, and an appropriate error message should be displayed.',
    actualResult: 'Rows missing the Settlement Date were correctly rejected, and the proper error message was shown.',
    status: 'pass',
  },
  {
    testCaseId: 'TC11',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate mandatory and valid fields "Trade Interest Rate(%)" and "Trade Value (Rs.)" during bulk import.',
    testCases: 'Verify that if "Trade Interest Rate(%)" or "Trade Value (Rs.)" is invalid or left blank in the Excel file, an appropriate error message is displayed.',
    testInputs: 'data given by client',
    expectedResult: 'Rows with invalid or blank values in these fields should be rejected, and a proper error message should be shown.',
    actualResult: 'The system correctly rejected invalid or blank values and displayed the appropriate error message.',
    status: 'pass',
  },
  {
    testCaseId: 'TC12',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate edit and bulk import restrictions for users without input rights.',
    testCases: 'Verify that a user without investment input access rights is unable to edit deals or perform bulk import.',
    testInputs: 'data given by client',
    expectedResult: 'Users without input rights should be restricted from editing deals or performing bulk import, and an appropriate error message should be displayed.',
    actualResult: 'Test executed successfully - users without input rights were restricted as expected.',
    status: 'pass',
  },
  {
    testCaseId: 'TC13',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Verify authorization restrictions for users with input-only access.',
    testCases: 'Ensure that a user with only input access rights is unable to authorize deals.',
    testInputs: 'data given by client',
    expectedResult: 'Users without authorization rights should be restricted from authorizing deals, and an appropriate error message should be displayed.',
    actualResult: 'User was unable to authorize deals, and the proper error message was displayed.',
    status: 'pass',
  },
  {
    testCaseId: 'TC14',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate duplicate Trade No. restriction during deal entry.',
    testCases: 'Verify that a deal with a Trade No. already existing in the system is not accepted.',
    testInputs: 'data given by client',
    expectedResult: 'Deals with duplicate Trade No. should be rejected, and an appropriate duplicate error message should be displayed.',
    actualResult: 'Deals with duplicate Trade No. were rejected, and the correct error message was displayed.',
    status: 'pass',
  },
  {
    testCaseId: 'TC15',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate field mapping and data accuracy during bulk import.',
    testCases: 'Verify that the following fields from the Excel/bulk import file are correctly reflected in the UI: 1 Leg Consideration (Principal) matches Trade Value in Excel; Trade Interest Rate (%) matches Repo Rate in Excel; Reversal Date for Lend matches Maturity Date in Excel; Settlement Date matches in both Excel and UI; Tenure and Settlement Type are calculated and displayed correctly.',
    testInputs: 'data given by client',
    expectedResult: 'All fields from the Excel/bulk import file should be accurately displayed in the UI, with tenure and settlement type correctly derived.',
    actualResult: 'All fields from the Excel/bulk import file were accurately displayed in the UI.',
    status: 'pass',
  },
  {
    testCaseId: 'TC16',
    testModule: 'Treps Investment',
    featureTab: 'bulk import',
    testScenario: 'Validate calculation of total interest and 2-leg consideration during deal import.',
    testCases: 'Verify that the system correctly calculates: Total Interest based on Trade Value, Trade Interest Rate (%), Tenure, and relevant dates, and 2-Leg Consideration (Amount) including principal and interest components.',
    testInputs: 'data given by client',
    expectedResult: 'Total interest and 2-leg consideration amounts should be calculated accurately and displayed correctly in the UI.',
    actualResult: 'Total interest and 2-leg consideration amounts were calculated correctly and displayed as expected.',
    status: 'pass',
  },

  // 3. Daily Cash Flow MIS Report — Capitalized Interest Flag & Running Balance
  {
    testCaseId: 'TC01',
    testModule: 'Cashflow Report',
    featureTab: 'Daily Cash Flow MIS Report',
    testScenario: 'Validate the resolution of the running balance issue when the Short Capitalized Interest Payment flag is enabled.',
    testCases: 'Verify that the Running Balance in the Daily Cash Flow MIS Report is correctly calculated and updated when the Short Capitalized Interest Payment flag is checked.',
    testInputs: 'Short Capitalized Interest Payment flag = Checked',
    expectedResult: 'The Running Balance should be calculated correctly by considering the applicable short capitalized interest payment amount when the flag is enabled.',
    actualResult: 'The Running Balance was correctly calculated and updated when the Short Capitalized Interest Payment flag was enabled.',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'Cashflow Report',
    featureTab: 'Daily Cash Flow MIS Report',
    testScenario: 'Validate the running balance and summary display when the Capitalized Interest Payment flag is not enabled.',
    testCases: 'Verify that when the Capitalized Interest Payment flag is unchecked and the interest payment has not yet been processed, the interest amount is not included in the summary and the Running Balance is calculated correctly based only on the applicable transactions.',
    testInputs: 'Capitalized Interest Payment flag = Unchecked',
    expectedResult: 'If the interest payment has not been processed and the Capitalized Interest Payment flag is unchecked, the interest amount should not be reflected in the summary. The Running Balance should be calculated correctly based on the actual processed transactions.',
    actualResult: 'When the Capitalized Interest Payment flag was unchecked and the interest payment had not been processed, the interest amount was not reflected in the summary and the Running Balance was calculated correctly.',
    status: 'pass',
  },

  // 4. Sanction Master / ECB Deal / Sanction Report / Sanction Bulk Upload
  {
    testCaseId: 'TC01',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'Sanction Master',
    testScenario: 'Validate "Currency" field behavior in Sanction Master',
    testCases: 'Verify that "Currency" field is visible, editable, and dropdown is available in Sanction Master.',
    testInputs: 'Sanction Master UI',
    expectedResult: '"Currency" field should be visible and editable in Sanction Master, and dropdown should be available with currency options.',
    actualResult: '"Currency" field is visible and editable in Sanction Master, and dropdown is available with options.',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate visibility of Sanction Facility ID based on currency',
    testCases: 'Verify that Sanction Facility ID is visible only when deal currency matches sanction FCY, and for INR sanction it is visible irrespective of deal currency.',
    testInputs: 'FCY Sanction & INR Sanction',
    expectedResult: 'If sanction is created in FCY, then Facility ID should be visible only when deal is created in the same FCY. If sanction is created in INR, then Facility ID should be visible for all deals irrespective of deal currency.',
    actualResult: 'System shows Facility ID only when FCY matches, and for INR sanction it is visible for all deal currencies.',
    status: 'pass',
  },
  {
    testCaseId: 'TC03',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'Sanction Master',
    testScenario: 'Validate currency field editability based on instrument type',
    testCases: 'Verify that "Currency" field is not editable for all instruments except ECB.',
    testInputs: 'Instrument Type = ECB vs Non-ECB',
    expectedResult: '"Currency" field should be editable only for ECB instrument. For all other instruments, "Currency" field should be non-editable.',
    actualResult: 'System allows currency edit only for ECB and restricts editing for other instruments.',
    status: 'pass',
  },
  {
    testCaseId: 'TC04',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'Sanction Master',
    testScenario: 'Validate currency field editability in fungible sanction for ECB',
    testCases: 'Verify that "Currency" column is not editable in fungible sanction for ECB.',
    testInputs: 'Fungible Sanction for ECB',
    expectedResult: '"Currency" column should be non-editable in fungible sanction even for ECB.',
    actualResult: 'System does not allow editing of "Currency" column in fungible sanction for ECB.',
    status: 'pass',
  },
  {
    testCaseId: 'TC05',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'Sanction Master',
    testScenario: 'Validate editability of "Has Sub Limit" checkbox in ECB main break-up',
    testCases: 'Verify that "Has Sub Limit" checkbox is not editable in ECB main break-up.',
    testInputs: 'ECB Main Break-up',
    expectedResult: '"Has Sub Limit" checkbox should be non-editable in ECB main break-up.',
    actualResult: 'System does not allow editing of "Has Sub Limit" checkbox in ECB main break-up.',
    status: 'pass',
  },
  {
    testCaseId: 'TC06',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'Sanction Master',
    testScenario: 'Validate multiple break-ups with different currencies under same sanction reference',
    testCases: 'Verify that user is not allowed to add multiple break-ups with different currencies under the same sanction reference.',
    testInputs: 'Multiple break-ups with different currencies',
    expectedResult: 'System should not allow adding multiple break-ups with different currencies under the same sanction reference.',
    actualResult: 'System does not allow adding multiple break-ups with different currencies under the same sanction reference.',
    status: 'pass',
  },
  {
    testCaseId: 'TC07',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate sanction utilization in FCY without INR conversion',
    testCases: 'Verify that when sanction and deal are created in FCY, the sanction utilization validation is applied on FCY drawdown amount and not converted to INR.',
    testInputs: 'FCY Sanction + FCY Deal',
    expectedResult: 'Sanction utilization should be validated based on FCY drawdown amount only, without converting it to INR.',
    actualResult: 'Sanction utilization is validated based on FCY drawdown amount and no INR conversion is applied.',
    status: 'pass',
  },
  {
    testCaseId: 'TC08',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate sanction utilization when sanction is in INR and deal is in FCY',
    testCases: 'Verify that when sanction is in INR and deal is created in any FCY, sanction utilization validation is applied based on (FCY drawdown * conversion rate) = INR amount.',
    testInputs: 'INR Sanction + FCY Deal',
    expectedResult: 'Sanction utilized amount should be calculated as (FCY drawdown * conversion rate) = INR amount and validated accordingly against sanction limit.',
    actualResult: 'System calculates sanction utilized amount as (FCY drawdown * conversion rate) and applies validation correctly.',
    status: 'pass',
  },
  {
    testCaseId: 'TC09',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate sanction limit restriction across multiple deals',
    testCases: 'Verify that system restricts drawdown when user tries to exceed sanction limit and also prevents usage of same sanction in another deal when available sanction is 0.',
    testInputs: 'Drawdown > Available Sanction',
    expectedResult: 'System should not allow drawdown amount exceeding the sanction limit. When available sanction becomes 0, the same sanction should not be allowed to be used in another deal.',
    actualResult: 'System restricts excess drawdown and does not allow usage of sanction in another deal when available limit is 0.',
    status: 'pass',
  },
  {
    testCaseId: 'TC10',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate cumulative sanction utilization across multiple deals',
    testCases: 'Verify that when same Sanction Facility ID is used in multiple deals (within limit), system calculates cumulative utilized amount correctly.',
    testInputs: 'Multiple Deals under same Sanction Facility ID',
    expectedResult: 'System should allow usage of same sanction in another deal if limit is not exhausted, and cumulative utilization across all deals should not exceed sanction limit.',
    actualResult: 'System allows usage of same sanction in multiple deals within limit and calculates cumulative utilization correctly.',
    status: 'pass',
  },
  {
    testCaseId: 'TC11',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'Sanction Master',
    testScenario: 'Validate update restrictions on existing sanction',
    testCases: 'Verify that system does not allow changing currency and restricts sanction amount to be less than utilized amount during initiate action.',
    testInputs: 'Initiate Action -> Update Sanction',
    expectedResult: 'System should not allow changing currency of an existing sanction. System should not allow updating sanction amount less than the already utilized amount.',
    actualResult: 'System restricts currency change and does not allow sanction amount to be updated below utilized amount.',
    status: 'pass',
  },
  {
    testCaseId: 'TC12',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'Sanction Master',
    testScenario: 'Validate restrictions during sanction renewal',
    testCases: 'Verify that during sanction renewal, system does not allow currency change and restricts sanction amount to be less than utilized amount.',
    testInputs: 'Initiate Action -> Renew Sanction',
    expectedResult: 'System should not allow changing the currency during sanction renewal. System should not allow updating sanction amount less than the already utilized amount.',
    actualResult: 'System restricts currency change and does not allow sanction amount to be updated below utilized amount during renewal.',
    status: 'pass',
  },
  {
    testCaseId: 'TC13',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'Sanction Master',
    testScenario: 'Validate restriction on multiple break-ups with different currencies during update and renewal of sanction',
    testCases: 'Verify that system does not allow adding multiple break-ups with different currencies under the same sanction reference while using initiate action (Update Sanction / Renew Sanction).',
    testInputs: 'Update Sanction / Renew Sanction',
    expectedResult: 'System should restrict adding break-ups with different currencies under the same sanction reference during update and renewal of sanction.',
    actualResult: 'System restricts adding multiple break-ups with different currencies under the same sanction reference during update and renewal.',
    status: 'pass',
  },
  {
    testCaseId: 'TC14',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate sanction limit checks during Add Deviation via initiate action',
    testCases: 'Verify that system restricts deviation amount based on available sanction and applies correct validation logic for FCY and INR sanctions.',
    testInputs: 'Initiate Action -> Add Deviation',
    expectedResult: 'System should not allow deviation amount more than available sanction. System should not allow deviation when available balance is zero. If sanction is in FCY, validation should be applied on FCY drawdown amount. If sanction is in INR, validation should be applied on (FCY drawdown * conversion rate) = INR amount.',
    actualResult: 'System restricts deviation beyond available sanction, blocks action when balance is zero, and applies correct validation for both FCY and INR scenarios.',
    status: 'pass',
  },
  {
    testCaseId: 'TC15',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate sanction limit checks during Change Disbursement Schedule via initiate action',
    testCases: 'Verify that system applies same validation rules during Change Disbursement Schedule as applied in Add Deviation.',
    testInputs: 'Initiate Action -> Change Disbursement Schedule',
    expectedResult: 'System should not allow disbursement amount more than available sanction and should block action when available balance is zero, applying FCY and INR conversion rules accurately.',
    actualResult: 'System applies all validation checks correctly during Change Disbursement Schedule as per defined rules.',
    status: 'pass',
  },
  {
    testCaseId: 'TC16',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate repayment amount against disbursement during Change Disbursement via initiate action',
    testCases: 'Verify that system restricts adding repayment amount more or less than disbursement amount during Change Disbursement.',
    testInputs: 'Change Disbursement Schedule',
    expectedResult: 'System should not allow repayment amount to be greater or less than the disbursement amount and should enforce matching values.',
    actualResult: 'System restricts adding repayment amount different from disbursement amount.',
    status: 'pass',
  },
  {
    testCaseId: 'TC17',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate disbursement and repayment schedule via Add Deviation and Change Disbursement Schedule',
    testCases: 'Verify that system allows adding disbursement schedule within available sanction limit through Add Deviation and Change Disbursement Schedule, with proper repayment schedule and history tracking.',
    testInputs: 'Add Deviation & Change Disbursement Schedule',
    expectedResult: 'System should allow adding disbursement schedule within available sanction limit. Proper repayment schedule should be maintained and all changes should be captured and visible in history.',
    actualResult: 'System allows adding disbursement schedule within limit, maintains proper repayment schedule, and updates are correctly reflected in history.',
    status: 'pass',
  },
  {
    testCaseId: 'TC18',
    testModule: 'Sanction Master ECB deal',
    featureTab: 'sanction report',
    testScenario: 'Validate currency column and amount calculation in Sanction Report',
    testCases: 'Verify that new currency column is added correctly, sanction currency is displayed properly, header naming is correct, and Principal O/S in INR is calculated and shown accurately.',
    testInputs: 'Sanction Report',
    expectedResult: 'Currency column should be added and visible in sanction report. Sanction currency should be displayed correctly. Header name should be proper and meaningful. Principal O/S in INR should be calculated using correct conversion rate and displayed accurately.',
    actualResult: 'Currency column is added correctly, sanction currency is visible, header naming is proper, and Principal O/S in INR is calculated and displayed correctly.',
    status: 'pass',
  },
  {
    testCaseId: 'TC19',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate currency column and dropdown in Sanction Bulk Upload',
    testCases: 'Verify that "Currency" column is present in Sanction Bulk Upload and dropdown is available with valid currency options.',
    testInputs: 'Sanction Bulk Upload template',
    expectedResult: '"Currency" column should be visible in bulk upload. Dropdown should be available with valid currency options.',
    actualResult: '"Currency" column is visible and dropdown is available with valid options in bulk upload.',
    status: 'pass',
  },
  {
    testCaseId: 'TC20',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate sanction reference consistency between basic details and main break-up',
    testCases: 'Verify that system throws validation error when sanction reference in basic details and main break-up are different.',
    testInputs: 'Sanction Bulk Upload',
    expectedResult: 'System should not allow mismatch and should show proper error message if sanction reference differs between basic details and main break-up.',
    actualResult: 'System throws proper validation error when sanction reference is different in basic details and main break-up.',
    status: 'pass',
  },
  {
    testCaseId: 'TC21',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate availability date in sub break-up against main break-up',
    testCases: 'Verify that system throws validation error when sub break-up availability date is greater than main break-up availability date.',
    testInputs: 'Sanction Bulk Upload',
    expectedResult: 'System should restrict and show proper error message if sub break-up availability date exceeds main break-up availability date.',
    actualResult: 'System throws proper validation error message when sub break-up availability date is greater.',
    status: 'pass',
  },
  {
    testCaseId: 'TC22',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate sub break-up sheet behavior when "Has Sub Limit" is set to NO',
    testCases: 'Verify that system throws validation error when user selects "Has Sub Limit" as NO and still adds details in sub break-up sheet.',
    testInputs: 'Has Sub Limit = NO',
    expectedResult: 'System should throw validation error and not allow submission when "Has Sub Limit" is NO but sub break-up details are provided.',
    actualResult: 'System throws validation error when sub break-up details are added despite "Has Sub Limit" being NO.',
    status: 'pass',
  },
  {
    testCaseId: 'TC23',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate usage of existing sanction reference',
    testCases: 'Verify that system allows using the same sanction reference which already exists.',
    testInputs: 'Existing Sanction Reference',
    expectedResult: 'System should allow selection and usage of an already existing sanction reference.',
    actualResult: 'System allows using the same existing sanction reference.',
    status: 'pass',
  },
  {
    testCaseId: 'TC24',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate date restriction in Sanction Bulk Upload',
    testCases: 'Verify that system does not allow sanction bulk upload when future date is provided as past system date.',
    testInputs: 'Sanction Bulk Upload',
    expectedResult: 'System should throw validation error and restrict upload if future date is entered as past system date.',
    actualResult: 'System throws validation error and does not allow bulk upload with incorrect date.',
    status: 'pass',
  },
  {
    testCaseId: 'TC25',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate "Has Sub Limit" restriction for ECB instrument',
    testCases: 'Verify that "Has Sub Limit" should be set to NO for ECB instrument and system applies validation accordingly.',
    testInputs: 'Instrument = ECB',
    expectedResult: 'System should restrict "Has Sub Limit" to NO for ECB instrument and throw validation error if set otherwise.',
    actualResult: 'System enforces "Has Sub Limit" as NO for ECB and throws validation error when attempted otherwise.',
    status: 'pass',
  },
  {
    testCaseId: 'TC26',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate mandatory currency field in sanction',
    testCases: 'Verify that system throws validation error when "Currency" column is kept blank.',
    testInputs: 'Currency = Blank',
    expectedResult: 'System should show validation error and restrict submission if "Currency" field is left blank.',
    actualResult: 'System throws proper validation error when "Currency" field is kept blank.',
    status: 'pass',
  },
  {
    testCaseId: 'TC27',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate consistency of main break-up number across sheets',
    testCases: 'Verify that system throws validation error when different main break-up numbers are used in both sheets.',
    testInputs: 'Mismatched Main Break-up Number',
    expectedResult: 'System should not allow mismatch and should show validation error if main break-up numbers are different across sheets.',
    actualResult: 'System throws validation error when different main break-up numbers are used in both sheets.',
    status: 'pass',
  },
  {
    testCaseId: 'TC28',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate currency restriction for non-ECB instruments during bulk upload',
    testCases: 'Verify that system throws validation error when currency other than base company currency is used for instruments except ECB during bulk upload.',
    testInputs: 'Non-ECB instrument with FCY',
    expectedResult: 'For all instruments except ECB, only base company currency should be allowed. System should throw validation error during import if currency is different from base currency.',
    actualResult: 'System throws validation error during bulk upload when non-base currency is used for instruments other than ECB.',
    status: 'pass',
  },
  {
    testCaseId: 'TC29',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate restriction on multiple currencies in main break-up under same sanction reference',
    testCases: 'Verify that system does not allow multiple currencies in main break-up under the same sanction reference.',
    testInputs: 'Multiple currencies in Main Break-up',
    expectedResult: 'System should restrict adding multiple currencies in main break-up for the same sanction reference and throw validation error.',
    actualResult: 'System does not allow multiple currencies in main break-up under same sanction reference and throws validation error.',
    status: 'pass',
  },
  {
    testCaseId: 'TC30',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate multiple currency restriction for ECB deals under same sanction reference',
    testCases: 'Verify that system does not allow creating multiple ECB deals in different currencies under the same sanction reference.',
    testInputs: 'Multiple ECB deals with different currencies',
    expectedResult: 'System should restrict creating multiple ECB deals with different currencies under the same sanction reference and show proper validation error.',
    actualResult: 'System restricts creating multiple ECB deals with different currencies under the same sanction reference.',
    status: 'pass',
  },
  {
    testCaseId: 'TC31',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate FCY usage for ECB instrument irrespective of base currency',
    testCases: 'Verify that system allows using FCY in ECB instrument even if it is different from base company currency.',
    testInputs: 'ECB instrument with FCY',
    expectedResult: 'System should allow FCY selection for ECB instrument regardless of base currency.',
    actualResult: 'System allows using FCY for ECB instrument irrespective of base currency.',
    status: 'pass',
  },
  {
    testCaseId: 'TC32',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate sub break-up amount against main break-up for fungible instrument',
    testCases: 'Verify that system does not allow sub break-up amount to exceed main break-up amount in fungible instrument.',
    testInputs: 'Sub Break-up Amount > Main Break-up Amount',
    expectedResult: 'System should throw validation error if sub break-up amount exceeds main break-up amount.',
    actualResult: 'System throws validation error when sub break-up amount exceeds main break-up amount in fungible instrument.',
    status: 'pass',
  },
  {
    testCaseId: 'TC33',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate presence of break-up details for sanction in other sheets',
    testCases: 'Verify that system throws validation error when a sanction is present in basic details but has no related break-up details in other sheets.',
    testInputs: 'Missing Break-up Details',
    expectedResult: 'System should restrict submission and show validation error if break-up details for the sanction are missing in other sheets.',
    actualResult: 'System throws validation error when sanction in basic details has no corresponding break-up in other sheets.',
    status: 'pass',
  },
  {
    testCaseId: 'TC34',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate multiple sanction references with different currencies',
    testCases: 'Verify that system allows creation of multiple sanction references with different currencies.',
    testInputs: 'Multiple Sanction References with different currencies',
    expectedResult: 'System should allow multiple sanction references even if the currencies are different.',
    actualResult: 'System allows creation of multiple sanction references with different currencies.',
    status: 'pass',
  },
  {
    testCaseId: 'TC35',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate file type/report during upload',
    testCases: 'Verify that system throws validation error when user tries to upload a file/report other than the allowed sanction bulk upload template.',
    testInputs: 'Invalid file/report template',
    expectedResult: 'System should restrict upload and show validation error if an incorrect report or file type is used.',
    actualResult: 'System throws validation error and does not allow upload of a different report.',
    status: 'pass',
  },
  {
    testCaseId: 'TC36',
    testModule: 'sanction bulk',
    featureTab: 'ECB/Sanction',
    testScenario: 'Validate dependency of sub break-up on main break-up',
    testCases: 'Verify that system does not allow adding sub break-up if there is no corresponding main break-up.',
    testInputs: 'Sub Break-up without Main Break-up',
    expectedResult: 'System should restrict submission and show validation error if sub break-up is added without a main break-up.',
    actualResult: 'System does not allow adding sub break-up without main break-up and throws validation error.',
    status: 'pass',
  },

  // 5. CC/OD and Bank Balance Master
  {
    testCaseId: 'TC01',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that the Bank Balance Master header is updated to "Actual Closing Balance".',
    testCases: 'Verify that the header name in the Bank Balance Master screen/report is displayed as "Actual Closing Balance" instead of the previous header name.',
    testInputs: 'Bank Balance Master screen',
    expectedResult: 'The system should display the header as "Actual Closing Balance" in the Bank Balance Master section.',
    actualResult: 'The header is successfully updated and displayed as "Actual Closing Balance".',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that the updated closing balance is reflected in Cashflow on the same effective date and interest calculation starts from that date.',
    testCases: 'Verify that when the closing balance is updated for a specific date, the same balance is reflected in the Cashflow on that date and interest calculation begins from the effective date of the balance update.',
    testInputs: 'Closing Balance Update',
    expectedResult: 'The updated closing balance should be visible in the Cashflow on the same date it is updated, and interest calculation should start from that date onward.',
    actualResult: 'The updated closing balance is reflected in the Cashflow on the same date, and interest calculation starts from the effective date as expected.',
    status: 'pass',
  },
  {
    testCaseId: 'TC03',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that a negative bank account balance cannot be updated after the sanction validity period has expired.',
    testCases: 'Verify that the system restricts users from updating the bank account balance with a negative value after the sanction validity date has passed.',
    testInputs: 'Negative Balance after Sanction Validity Expiry',
    expectedResult: 'The system should not allow updating the bank account balance with a negative value after the sanction validity period and should display an appropriate validation message.',
    actualResult: 'The system prevents the update of a negative bank account balance after the sanction validity period and displays the appropriate validation message.',
    status: 'pass',
  },
  {
    testCaseId: 'TC04',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that a negative bank balance cannot be updated for an account that does not have any CC/OD deal associated with it.',
    testCases: 'Verify that the system restricts users from updating the bank balance as a negative value for an account where no CC/OD deal has been created.',
    testInputs: 'Negative Balance without CC/OD Deal',
    expectedResult: 'The system should not allow a negative bank balance update for an account without an associated CC/OD deal and should display an appropriate validation message.',
    actualResult: 'The system prevents the negative bank balance update for an account without a CC/OD deal and displays the appropriate validation message.',
    status: 'pass',
  },
  {
    testCaseId: 'TC05',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that a positive bank balance can be updated for an account where no CC/OD deal has been created.',
    testCases: 'Verify that the system allows updating a positive bank balance for an account that is not linked to any CC/OD deal.',
    testInputs: 'Positive Balance without CC/OD Deal',
    expectedResult: 'The system should allow the user to update a positive bank balance for an account even if no CC/OD deal has been created for that account.',
    actualResult: 'The system successfully allows updating a positive bank balance for an account with no associated CC/OD deal.',
    status: 'pass',
  },
  {
    testCaseId: 'TC06',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that the system restricts updating a CC/OD bank balance beyond the sanctioned limit.',
    testCases: 'Verify that when a user attempts to update the bank balance amount for a CC/OD account with a value greater than the sanctioned limit, the system displays an appropriate validation message.',
    testInputs: 'CC/OD Balance > Sanctioned Limit',
    expectedResult: 'The system should not allow the bank balance amount to exceed the sanctioned limit for a CC/OD account and should display a validation message indicating that the entered amount exceeds the sanctioned limit.',
    actualResult: 'The system prevents updating the bank balance amount beyond the sanctioned limit and displays the appropriate validation message.',
    status: 'pass',
  },
  {
    testCaseId: 'TC07',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that utilisation is updated correctly after repayment and reflected in the sanction details.',
    testCases: 'Verify that when a repayment is processed, the utilised amount is reduced accordingly and the updated utilisation is reflected in both the repayment details and the sanction record.',
    testInputs: 'CC/OD Repayment',
    expectedResult: 'The system should correctly update the utilisation amount after repayment and display the revised utilisation value in the sanction details.',
    actualResult: 'The utilisation amount is updated correctly after repayment and is accurately reflected in the sanction details.',
    status: 'pass',
  },
  {
    testCaseId: 'TC08',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that the closing balance on the sanction validity date for a linked CC/OD deal is either zero or positive.',
    testCases: 'Verify that for a CC/OD deal linked to a sanction, the closing balance on the sanction validity date cannot be negative and remains either zero or positive.',
    testInputs: 'Closing Balance on Sanction Validity Date',
    expectedResult: 'The system should ensure that the closing balance on the sanction validity date is either 0 or a positive value for the linked CC/OD deal.',
    actualResult: 'The closing balance on the sanction validity date is maintained as zero or positive for the linked CC/OD deal.',
    status: 'pass',
  },
  {
    testCaseId: 'TC09',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that borrowing is reflected in the ALM Treasury Report from the date the bank balance is updated.',
    testCases: 'Verify that when a bank balance is updated, the corresponding borrowing amount is shown in the ALM Treasury Report on the same effective date of the balance update.',
    testInputs: 'ALM Treasury Report',
    expectedResult: 'The system should display the borrowing amount in the ALM Treasury Report starting from the date on which the bank balance is updated.',
    actualResult: 'The borrowing amount is accurately reflected in the ALM Treasury Report on the same date as the bank balance update.',
    status: 'pass',
  },
  {
    testCaseId: 'TC10',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that the borrowing amount is correctly reflected in the Borrowing Register Report after the bank balance update.',
    testCases: 'Verify that when a bank balance is updated, the corresponding borrowing entry is displayed in the Borrowing Register Report from the effective date of the balance update.',
    testInputs: 'Borrowing Register Report',
    expectedResult: 'The system should show the borrowing amount in the Borrowing Register Report on the same date the bank balance is updated.',
    actualResult: 'The borrowing amount is correctly reflected in the Borrowing Register Report from the bank balance update date.',
    status: 'pass',
  },
  {
    testCaseId: 'TC11',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that bank balance updates through bulk import are correctly reflected in the Deal Cashflow UI.',
    testCases: 'Verify that when bank balances are updated using the bulk import functionality, the corresponding entries are accurately reflected in the Deal Cashflow UI.',
    testInputs: 'Bank Balance Bulk Import',
    expectedResult: 'The system should successfully process the bulk import and display the updated bank balance details in the Deal Cashflow UI from the effective date.',
    actualResult: 'The bank balance updates processed through bulk import are correctly reflected in the Deal Cashflow UI.',
    status: 'pass',
  },
  {
    testCaseId: 'TC12',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that the CC Bank Account dropdown in the Deal UI displays only the relevant bank accounts of the selected lender bank.',
    testCases: 'Verify that in the CC Bank Account field dropdown on the Deal UI, only those bank accounts of the Home Entity are displayed that belong to the bank selected as the lender bank for the CC/OD facility.',
    testInputs: 'CC Bank Account Dropdown',
    expectedResult: 'The system should display only the Home Entity bank accounts associated with the selected lender bank in the CC Bank Account dropdown.',
    actualResult: 'The CC Bank Account dropdown displays only the relevant Home Entity bank accounts linked to the selected lender bank.',
    status: 'pass',
  },
  {
    testCaseId: 'TC13',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that a bank account created for tracking purposes allows updating a positive bank balance in the Bank Balance Master.',
    testCases: 'Verify that when a bank account is created only for tracking purposes, the user is able to update a positive bank balance in the Bank Balance Master.',
    testInputs: 'Tracking-Purpose Bank Account (Positive Balance)',
    expectedResult: 'The system should allow updating a positive bank balance in the Bank Balance Master for a bank account created for tracking purposes.',
    actualResult: 'The positive bank balance is successfully updated in the Bank Balance Master for the tracking-purpose bank account.',
    status: 'pass',
  },
  {
    testCaseId: 'TC14',
    testModule: 'CC/OD',
    featureTab: 'CC/OD and Bank Balance',
    testScenario: 'Validate that a negative bank balance cannot be updated in the Bank Balance Master for a bank account created only for tracking purposes.',
    testCases: 'Verify that when a bank account is created solely for tracking purposes, the system restricts the user from updating a negative bank balance in the Bank Balance Master.',
    testInputs: 'Tracking-Purpose Bank Account (Negative Balance)',
    expectedResult: 'The system should restrict updating a negative bank balance for a tracking-purpose bank account and should display an appropriate validation message.',
    actualResult: 'The system prevents the update of a negative bank balance and displays the appropriate validation message.',
    status: 'pass',
  },

  // 6. Mutual Fund — Split Action / Initiate Action
  {
    testCaseId: 'TC01',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate the availability and editability of the Split Action in an MF deal.',
    testCases: 'Verify that the Split Action is visible and clickable under the Initiate Action option for an MF deal, and all fields available in the Split Action are editable.',
    testInputs: 'Initiate Action -> Split Action',
    expectedResult: 'The Split Action should be visible and clickable under Initiate Action, and all fields in the Split Action should be editable.',
    actualResult: 'The Split Action was visible and clickable under Initiate Action, and all fields in the Split Action were editable.',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate Split Ratio Entry',
    testCases: 'Verify that the user can enter the applicable New:Old split ratio while performing a split action from an existing ISIN to a new ISIN.',
    testInputs: 'Ratio (New:Old)',
    expectedResult: 'The user should be able to enter and edit the applicable split ratio in the Ratio (New:Old) field.',
    actualResult: 'The applicable New:Old split ratio was entered successfully in the Split Action.',
    status: 'pass',
  },
  {
    testCaseId: 'TC03',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate AMC filtering in the Split Out From section during the MF Split Action.',
    testCases: 'Verify that while performing the Split Action for a selected Mutual Fund (Split In), the Split Out From dropdown displays only the schemes belonging to the same AMC as the selected Mutual Fund (Split In).',
    testInputs: 'Split Out From Dropdown',
    expectedResult: 'The Split Out From dropdown should display only the schemes belonging to the same AMC as the selected Mutual Fund (Split In). Schemes belonging to any other AMC should not be available for selection.',
    actualResult: 'The Split Out From dropdown displayed only the schemes belonging to the same AMC as the selected Mutual Fund, and schemes from other AMCs were not available for selection.',
    status: 'pass',
  },
  {
    testCaseId: 'TC04',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate Split In Units Calculation',
    testCases: 'Verify that the units allocated under the Split In section are calculated correctly based on the applied split ratio.',
    testInputs: 'Existing Units & Applied Split Ratio',
    expectedResult: 'The system should calculate and display the correct number of Split In units based on the existing units and the entered split ratio.',
    actualResult: 'The Split In units were calculated and displayed correctly based on the applied split ratio.',
    status: 'pass',
  },
  {
    testCaseId: 'TC05',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate Investment Holding Details',
    testCases: 'Verify that the existing MF deal\'s holding details are displayed correctly in the Investment Holding Details table during the split action.',
    testInputs: 'Investment Holding Details Table',
    expectedResult: 'The Investment Holding Details table should display the correct transaction date, NAV date, units, and purchase NAV for the existing MF deal.',
    actualResult: 'The existing MF deal\'s holding details were displayed correctly in the Investment Holding Details table.',
    status: 'pass',
  },
  {
    testCaseId: 'TC06',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate the Value Date in the Split Out and Split In transaction.',
    testCases: 'Verify that the Value Date in the Split Out deal is validated against the Transaction Date, and the Value Date in the Split In deal is automatically fetched from the Split Out transaction.',
    testInputs: 'Value Date & Transaction Date',
    expectedResult: 'In the Split Out deal, the Value Date should be after the Transaction Date. In the Split In deal, the Value Date should be automatically fetched from the corresponding Split Out transaction.',
    actualResult: 'The Value Date in the Split Out deal was validated successfully against the Transaction Date, and the Value Date in the Split In deal was automatically fetched from the Split Out transaction.',
    status: 'pass',
  },
  {
    testCaseId: 'TC07',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate NAV Calculation Based on Split Ratio.',
    testCases: 'Verify that the NAV for the new ISIN is calculated correctly based on the entered split ratio.',
    testInputs: 'New ISIN NAV & Split Ratio',
    expectedResult: 'The system should calculate and display the correct NAV for the new ISIN based on the applied split ratio.',
    actualResult: 'The NAV for the new ISIN was calculated and displayed correctly based on the applied split ratio.',
    status: 'pass',
  },
  {
    testCaseId: 'TC08',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate the Holding Summary after performing the MF Split Action.',
    testCases: 'Verify that after successfully performing the Split Action, all values displayed in the Holding Summary for both the existing (Split Out) deal and the new (Split In) deal are updated and displayed correctly.',
    testInputs: 'Holding Summary (Total Units, Average Purchase NAV, Total Investment Amount, Current Market Value, Unrealised/Realised P&L, XIRR)',
    expectedResult: 'After the Split Action is completed, the Holding Summary should display the correct values for both the Split Out and Split In deals, including Total Units, Average Purchase NAV, Total Investment Amount, Current Market Value, Unrealised Profit/Loss, Realised Profit/Loss, and XIRR.',
    actualResult: 'After performing the Split Action, all values in the Holding Summary for both the Split Out and Split In deals were updated correctly and displayed as expected.',
    status: 'pass',
  },
  {
    testCaseId: 'TC09',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate transaction history after performing the MF Split Action.',
    testCases: 'Verify that after successfully performing the Split Out and Split In actions, the transaction history of both the existing deal and the new deal is updated correctly with all split-related details.',
    testInputs: 'Transaction History',
    expectedResult: 'The Split Out transaction should be recorded in the existing MF deal history, and the Split In transaction should be recorded in the new MF deal history with correct transaction date, action type, units, NAV, and investment amount.',
    actualResult: 'After performing the Split Out and Split In actions, the transaction history of both the existing and new MF deals was updated correctly, and all split-related details were displayed accurately.',
    status: 'pass',
  },
  {
    testCaseId: 'TC10',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate Split Out action on a deal with pending authorization of the first investment transaction.',
    testCases: 'Verify that the system does not allow the user to perform a Split Out action on an MF deal where the first investment transaction is in Pending Authorization status.',
    testInputs: 'First Investment Transaction = Pending Authorization',
    expectedResult: 'The system should not allow the Split Out action on a deal whose first investment transaction is pending authorization. An appropriate validation/error message should be displayed, indicating that the deal cannot be split until the investment transaction is authorized.',
    actualResult: 'When attempting to perform the Split Out action on a deal with the first investment transaction in Pending Authorization status, the system prevented the action and displayed the appropriate validation message.',
    status: 'pass',
  },
  {
    testCaseId: 'TC11',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate Split Out behavior when a Redemption transaction is pending authorization.',
    testCases: 'Verify that the system allows the user to perform a Split Out action on an MF deal even when a Redemption transaction is in Pending Authorization status, and validate the behavior while authorizing the pending Redemption transaction after the Split Out.',
    testInputs: 'Redemption Transaction = Pending Authorization',
    expectedResult: 'The system should allow the Split Out action if there are sufficient existing units, irrespective of the pending Redemption authorization. After the Split Out is completed, if authorizing the pending Redemption transaction results in a negative unit balance, the system should prevent the authorization and display an appropriate validation/error message indicating insufficient units in the split out deal.',
    actualResult: 'The system allowed the Split Out action on the deal with a pending Redemption transaction. However, after the Split Out, authorizing the pending Redemption transaction would result in a negative unit balance, and the system prevented the authorization with an appropriate validation message.',
    status: 'pass',
  },
  {
    testCaseId: 'TC12',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate the available actions for a deal after performing the Split Out action.',
    testCases: 'Verify that after all units of an MF deal have been Split Out, only the MF Modification action is available under Initiate Action. Other transaction actions such as Investment, Redemption, and Switch should not be available.',
    testInputs: 'Initiate Action Menu after Split Out',
    expectedResult: 'After the Split Out action, the Initiate Action menu should display only the MF Modification option. The Investment, Redemption, Switch, and any other transaction-related actions should not be visible or available for the Split Out deal.',
    actualResult: 'After the Split Out action, only the MF Modification option was available under Initiate Action. The Investment, Redemption, Switch, and other transaction-related actions were not displayed for the Split Out deal.',
    status: 'pass',
  },
  {
    testCaseId: 'TC13',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate Split In Action for Already Split In Deal',
    testCases: 'Verify that Split In action cannot be performed again on a deal where Split In has already been completed.',
    testInputs: 'Already Split In Deal',
    expectedResult: 'The system should remove the Split Action option from the Initiate Action menu for a deal where Split In has already been performed.',
    actualResult: 'The Split Action option was correctly removed from the Initiate Action menu after Split In was performed on the deal.',
    status: 'pass',
  },
  {
    testCaseId: 'TC14',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate Scheme Availability Based on Split In Deal',
    testCases: 'Verify that, while performing the Split Action, only those deals are available in the Split Out Scheme from which the Plan, Option, and Fund Name match with the Split In deal.',
    testInputs: 'Plan, Option, and Fund Name matching',
    expectedResult: 'The system should display only those deals in the Split Out Scheme where the Plan, Option, and Fund Name are the same as the selected Split In deal.',
    actualResult: 'The system correctly displayed only those deals in the Split Out Scheme where the Plan, Option, and Fund Name matched with the selected Split In deal.',
    status: 'pass',
  },
  {
    testCaseId: 'TC15',
    testModule: 'Mutual Fund',
    featureTab: 'split action',
    testScenario: 'Validate Previous Transactions in Split In Deal',
    testCases: 'Verify that the Split In deal does not have any previous transactions before performing the Split Action.',
    testInputs: 'Split In Deal with Existing Transactions',
    expectedResult: 'The system should allow the Split In transaction only when there are no previous transactions in the Split In deal. If any transaction already exists in the deal, the system should not allow the Split Action and should display an appropriate validation message.',
    actualResult: 'The system correctly restricted the Split Action when a previous transaction existed in the Split In deal and displayed the appropriate validation message.',
    status: 'pass',
  },

  // 7. Fixed Deposit (FD) — Placement, Rollover, FD End, TDS & Lien Marking (User Manual 1.0)
  {
    testCaseId: 'TC01',
    testModule: 'Fixed Deposit (FD)',
    featureTab: 'FD Rollover & TDS',
    testScenario: 'Validate TDS calculation and accounting reflection for FD End (Maturity/Closure) with Coupon Interest Payment.',
    testCases: 'Verify that upon executing FD End (Maturity/Closure) under Coupon Interest Payment mode, the system accurately calculates TDS on the final coupon and posts balanced debit and credit entries in Deal-wise Accounting.',
    testInputs: 'FD Deal (Coupon Interest Payment), TDS Rate = 10%, Action = FD End',
    expectedResult: 'The system should calculate the final coupon interest and deduct TDS accurately. Accounting vouchers should reflect Debit Interest Receivable/Accrual, Credit Bank Account (Net Coupon + Principal), and Credit TDS Payable GL.',
    actualResult: 'TDS on final coupon interest was calculated accurately and reflected properly in the FD End accounting entries.',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'Fixed Deposit (FD)',
    featureTab: 'FD Rollover & TDS',
    testScenario: 'Validate TDS calculation and accounting reflection for FD End (Maturity/Closure) with Bullet Interest Payment.',
    testCases: 'Verify that upon executing FD End (Maturity/Closure) under Bullet Interest Payment mode, the system calculates TDS on cumulative interest accrued across the tenure and reflects balanced accounting entries.',
    testInputs: 'FD Deal (Bullet Interest Payment), TDS Rate = 10%, Action = FD End',
    expectedResult: 'The system should compute cumulative bullet interest, deduct statutory TDS, and post balanced accounting entries for Net Maturity Proceeds and TDS Payable GL.',
    actualResult: 'Cumulative bullet interest and TDS deduction were accurately calculated and reflected in FD End accounting entries.',
    status: 'pass',
  },
  {
    testCaseId: 'TC03',
    testModule: 'Fixed Deposit (FD)',
    featureTab: 'FD Rollover & TDS',
    testScenario: 'Validate FD Rollover under Coupon Interest Payment mode with TDS reflection.',
    testCases: 'Verify that during FD Rollover under Initiate Action for a Coupon Interest Payment deal, completed tenure coupon interest undergoes TDS deduction and the new rollover FD tranche commences with the original principal.',
    testInputs: 'Initiate Action -> FD Rollover (Coupon Mode)',
    expectedResult: 'The system should settle the matured coupon net of TDS, post TDS to the configured TDS GL Code, and create/update the rollover FD schedule with the original principal amount.',
    actualResult: 'FD Rollover under Coupon mode accurately posted TDS in accounting and rolled over the original principal.',
    status: 'pass',
  },
  {
    testCaseId: 'TC04',
    testModule: 'Fixed Deposit (FD)',
    featureTab: 'FD Rollover & TDS',
    testScenario: 'Validate FD Rollover under Bullet Interest Payment mode (Compound Reinvestment) with TDS deduction.',
    testCases: 'Verify that during FD Rollover for a Bullet Interest Payment deal, TDS is deducted from cumulative accrued interest and net proceeds (Principal + Net Interest after TDS) are rolled over into the renewed FD deal.',
    testInputs: 'Initiate Action -> FD Rollover (Bullet Mode)',
    expectedResult: 'The system should deduct TDS on gross bullet interest, reflect the TDS entry in accounting, and set the new rollover principal to Original Principal plus Net Interest after TDS.',
    actualResult: 'TDS was deducted from bullet interest and the net principal + interest amount was rolled over accurately.',
    status: 'pass',
  },
  {
    testCaseId: 'TC05',
    testModule: 'Fixed Deposit (FD)',
    featureTab: 'FD Lien Marking',
    testScenario: 'Validate FD Lien Marking against Overdraft (OD) or Letter of Credit (LC) facility.',
    testCases: 'Verify that when an active FD is marked under Lien via Initiate Action, the system restricts premature encashment/closure beyond the unencumbered FD balance.',
    testInputs: 'Initiate Action -> Lien Marking',
    expectedResult: 'The system should record the Lien amount against the FD deal and restrict premature withdrawal or closure of the lien-marked amount until the lien is released.',
    actualResult: 'The system successfully marked the lien on the FD deal and restricted encashment of the lien-marked balance.',
    status: 'pass',
  },

  // 8. Accounting & Global Accounting Code Master (GL Master & Deal-Wise Accounting)
  {
    testCaseId: 'TC01',
    testModule: 'Accounting & Ledger',
    featureTab: 'Global Accounting Code Master',
    testScenario: 'Validate editability of newly added GL Code fields in Global Accounting Code Master.',
    testCases: 'Verify that all newly added GL Code configuration fields in the Global Accounting Code Master are editable and allow saving updated GL codes across instruments.',
    testInputs: 'Global Accounting Code Master -> New GL Code Fields',
    expectedResult: 'All newly added GL Code fields should be editable, and the system should save the updated GL codes without validation errors.',
    actualResult: 'All newly added GL Code fields in the Global Accounting Code Master are editable and saved successfully.',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'Accounting & Ledger',
    featureTab: 'Deal-wise Accounting',
    testScenario: 'Validate prevention of duplicate or reversal accounting entries for existing deals on an old branch.',
    testCases: 'Verify that accounting entries are not regenerated and no reversal entries are created for existing deals whose accounting entries were already generated and saved on the old branch.',
    testInputs: 'Existing Deal with Saved Accounting on Old Branch',
    expectedResult: 'No additional accounting entry or reversal voucher should be generated for existing deals already accounted for on the old branch.',
    actualResult: 'No duplicate accounting entry or reversal entry was created for existing deals from the old branch.',
    status: 'pass',
  },
  {
    testCaseId: 'TC03',
    testModule: 'Government Securities (GSec)',
    featureTab: 'G-Sec Accounting',
    testScenario: 'Validate G-Sec GL Code reflection based on selected Investment Purpose (SLR, LCR, Investment, Lien, Other).',
    testCases: 'Verify that the GL Code configured in the Global Accounting Code Master for each G-Sec Investment Purpose (SLR, LCR, Investment, Lien, Other) is accurately reflected in Deal-wise Accounting entries.',
    testInputs: 'G-Sec Deal with Purpose = SLR / LCR / Investment / Lien / Other',
    expectedResult: 'The accounting voucher should fetch and display the exact GL Code configured for the selected G-Sec Investment Purpose.',
    actualResult: 'The configured GL Code was reflected accurately in accounting entries based on the selected G-Sec Investment Purpose.',
    status: 'pass',
  },
  {
    testCaseId: 'TC04',
    testModule: 'Accounting & Ledger',
    featureTab: 'GL Master Effective Date & Undo',
    testScenario: 'Validate GL Code effective date application and Undo action behavior in GL Master.',
    testCases: 'Verify that accounting entries reflect the updated GL Code strictly from the date it was updated in the GL Master, and performing an Undo action in GL Master removes the uncommitted GL Code from accounting.',
    testInputs: 'GL Master Update Date & Undo Action',
    expectedResult: 'Accounting entries generated on or after the update date should reflect the updated GL Code. After performing Undo in the GL Master, the reverted GL Code should no longer be visible or applied in accounting.',
    actualResult: 'Accounting entries reflected the GL Code as per the update date, and undoing the action in GL Master removed the code from accounting as expected.',
    status: 'pass',
  },

  // 9. NCD, Commercial Paper (CP), WCDL, LC/BG & Hedge Modules (User Manual 1.0)
  {
    testCaseId: 'TC01',
    testModule: 'Non-Convertible Debentures',
    featureTab: 'NCD Deal & Coupon Schedule',
    testScenario: 'Validate NCD deal booking, ISIN mapping, and coupon cashflow schedule generation.',
    testCases: 'Verify that when an NCD deal is booked with ISIN, Face Value, Units, Coupon Rate, and Put/Call dates, the system generates an accurate coupon payment and redemption schedule in the Cashflow tab.',
    testInputs: 'NCD Deal (ISIN, Face Value, Coupon Rate %, Frequency)',
    expectedResult: 'The system should validate the ISIN details from the Security Master and generate accurate periodic coupon and principal redemption cashflows as per the day count convention.',
    actualResult: 'NCD deal was booked and the coupon and redemption cashflow schedule was generated accurately.',
    status: 'pass',
  },
  {
    testCaseId: 'TC02',
    testModule: 'Commercial Paper (CP)',
    featureTab: 'CP Issuance & Discount Amortization',
    testScenario: 'Validate Commercial Paper (CP) discounted issue price and redemption at Face Value.',
    testCases: 'Verify that for a Commercial Paper (CP) deal, the system calculates the discount amount (Face Value minus Issue Value) and schedules amortization and full Face Value settlement on Maturity Date.',
    testInputs: 'CP Deal (Face Value, Discounted Issue Price, Value Date, Maturity Date)',
    expectedResult: 'The system should accurately compute the discount amount, generate the discount amortization schedule across the tenure, and reflect full Face Value payable on the Maturity Date.',
    actualResult: 'The system accurately computed the CP discount, amortization schedule, and maturity settlement at Face Value.',
    status: 'pass',
  },
  {
    testCaseId: 'TC03',
    testModule: 'Working Capital Demand Loan',
    featureTab: 'WCDL Sub-limit & Rollover',
    testCases: 'Verify that a WCDL drawdown carves out utilization from the linked Working Capital / CC Sanction limit and allows rollover on the maturity date within sanction validity.',
    testScenario: 'Validate WCDL drawdown against sanction sub-limit and maturity rollover.',
    testInputs: 'WCDL Deal under Sanction Sub-Limit, Initiate Action -> Rollover',
    expectedResult: 'The system should validate the WCDL drawdown against the available sanction sub-limit and allow rollover on maturity when the parent sanction is active.',
    actualResult: 'WCDL drawdown was validated against the sanction sub-limit and maturity rollover executed successfully.',
    status: 'pass',
  },
  {
    testCaseId: 'TC04',
    testModule: 'Letter of Credit (LOC)',
    featureTab: 'LC Issuance & Margin FD Lien',
    testScenario: 'Validate Letter of Credit (LC) issuance, non-fund sanction limit utilization, and commission calculation.',
    testCases: 'Verify that booking an LC deal validates available non-fund sanction limit, calculates LC issuance commission and GST, and links applicable margin money/FD lien.',
    testInputs: 'LC Deal (Usance/Sight, LC Amount, Expiry Date, Margin %)',
    expectedResult: 'The system should deduct the LC amount from the available non-fund sanction limit, compute commission and GST accurately, and record the margin details.',
    actualResult: 'LC issuance utilized the non-fund sanction limit and computed commission and margin details accurately.',
    status: 'pass',
  },
];

/**
 * Returns targeted Beacon (TMS) User Manual 1.0 domain specifications based on the module or user query.
 */
export function getBeaconManualModuleGuide(moduleOrQuery: string): string {
  const q = (moduleOrQuery || '').toLowerCase();
  const guides: string[] = [];

  if (q.includes('term loan') || q.includes('tl') || q.includes('stl') || q.includes('short term') || q.includes('penalty') || q.includes('overdue') || q.includes('autopay')) {
    guides.push(`BEACON USER MANUAL 1.0 — TERM LOAN (TL) & SHORT TERM LOAN (STL) SPECIFICATION:
- Screens & Tabs: Basic Details, Interest & Rate Parameters, Repayment Schedule, Cashflow, Fees & Charges, Security Mapping, Initiate Action, Transaction History.
- Key Validations:
  1. Disbursement vs Sanction: Tranche disbursement cannot exceed Available Sanction Limit; Repayment Schedule total principal must equal Disbursed Amount.
  2. Floating Rate & Reset: Effective Rate = Benchmark Rate (MCLR/Repo/SOFR from Benchmark Master) + Spread (%). Updating Benchmark Rate recalculates future cashflow interest from the Reset Date.
  3. Penalty & Overdue Report: Penalty entries (Penalty Interest % and Penalty Principal %) are generated in Deal Cashflow and Overdue Report ONLY when overdue occurs AFTER loan disbursement AND Default/Penalty Rate > 0. Without disbursement (or if penalty rate is 0), penalty entries are NOT generated.
  4. Autopay Overdue Report: Deals under active Autopay are excluded from Overdue Report until the Autopay end date; post-Autopay overdues appear in Overdue Report with penalty entries.
  5. Initiate Actions: Disbursement, Rate Reset, Prepayment / Foreclosure, Add Deviation, Change Disbursement Schedule.`);
  }

  if (q.includes('sanction') || q.includes('ecb') || q.includes('break-up') || q.includes('breakup') || q.includes('sub limit') || q.includes('facility id')) {
    guides.push(`BEACON USER MANUAL 1.0 — SANCTION MASTER, ECB & SANCTION BULK UPLOAD SPECIFICATION:
- Screens & Sheets: Sanction Master UI (Basic Details, Main Break-up, Sub Break-up), Sanction Bulk Upload (.xlsx with Row 5 headers & Row 6 data), Sanction Report, Deal UI Sanction Facility ID dropdown.
- Key Validations:
  1. Currency Editability: "Currency" field is visible and editable ONLY for non-fungible ECB instrument; locked/non-editable for domestic instruments and fungible ECB sanctions.
  2. Multi-Currency Break-up Restriction: System restricts adding multiple break-ups with different currencies under the same Sanction Reference (during creation, Update Sanction, and Renew Sanction).
  3. Has Sub Limit: Locked to NO for ECB main break-up; if "Has Sub Limit" = NO, adding Sub Break-up rows throws validation error; Sub Break-up Availability Date cannot exceed Main Break-up Availability Date.
  4. Facility ID Visibility: FCY Sanction Facility ID is visible ONLY when Deal Currency matches Sanction FCY; INR Sanction Facility ID is visible across all deal currencies.
  5. Utilization Math: FCY Sanction + FCY Deal validates directly on FCY drawdown (no INR conversion); INR Sanction + FCY Deal validates on (FCY Drawdown * Conversion Rate) = INR Amount. Cumulative utilization across deals cannot exceed limit; when available limit = 0, sanction is blocked.
  6. Initiate Actions (Update Sanction, Renew Sanction, Add Deviation, Change Disbursement Schedule): Cannot change currency or reduce sanction below utilized amount; Repayment amount must equal Disbursement amount.`);
  }

  if (q.includes('mutual fund') || q.includes('mf') || q.includes('split') || q.includes('nav') || q.includes('redemption') || q.includes('switch')) {
    guides.push(`BEACON USER MANUAL 1.0 — MUTUAL FUND (MF) INVESTMENT & SPLIT ACTION SPECIFICATION:
- Screens & Actions: MF Deal Booking, Initiate Action -> Investment (Additional Purchase), Redemption (FIFO), Switch, Split Action (Split Out / Split In), MF Modification, Investment Holding Details, Holding Summary, Transaction History.
- Key Validations:
  1. Split Action Visibility & Ratio: Visible and clickable under Initiate Action; all fields editable; accepts Ratio (New:Old) for ISIN split and calculates Split In Units and new ISIN NAV.
  2. AMC & Scheme Filtering: "Split Out From" dropdown displays ONLY schemes belonging to the same AMC and matching Plan, Option, and Fund Name as the selected Split In deal.
  3. Prior Transaction & Pending Authorization Checks: Split In deal must have NO prior transactions; Split Out is blocked if first investment transaction is in Pending Authorization status; if a Redemption is Pending Authorization, post-split redemption authorization is blocked if it causes a negative unit balance.
  4. Value Date & Holding Summary: Split Out Value Date validated against Transaction Date; Split In Value Date auto-fetched from Split Out. Updates Total Units, Average Purchase NAV, Total Investment Amount, Current Market Value, Unrealised/Realised P&L, and XIRR.
  5. Post-Split Menu & Cascading Undo: After 100% units are Split Out, ONLY "MF Modification" is visible under Initiate Action; Split Action is removed once Split In is completed; Undoing Split-In from Transaction History automatically reverts Split-Out and vice versa.`);
  }

  if (q.includes('cc') || q.includes('od') || q.includes('cash credit') || q.includes('overdraft') || q.includes('bank balance') || q.includes('closing balance')) {
    guides.push(`BEACON USER MANUAL 1.0 — CC/OD & BANK BALANCE MASTER SPECIFICATION:
- Screens & Reports: CC/OD Deal UI (CC Bank Account dropdown), Bank Balance Master ("Actual Closing Balance" header & Bulk Import), Deal Cashflow, ALM Treasury Report, Borrowing Register Report.
- Key Validations:
  1. CC Bank Account Filtering: Displays ONLY Home Entity bank accounts belonging to the selected Lender Bank.
  2. Effective Date Reflection: Closing balance updated via UI or Bulk Import reflects in Cashflow, ALM Treasury Report, and Borrowing Register Report from the same Effective Date, and interest accrues from that date.
  3. Negative vs Positive Balance Rules: Negative closing balance is restricted after sanction validity expiry, restricted when no CC/OD deal is linked, restricted beyond sanctioned limit, and restricted for tracking-purpose bank accounts. Positive balance is allowed without a linked CC/OD deal and on tracking-purpose accounts. On sanction validity date, balance must be >= 0.`);
  }

  if (q.includes('treps') || q.includes('bulk import') || q.includes('bulk upload') || q.includes('save sample')) {
    guides.push(`BEACON USER MANUAL 1.0 — TREPS (INVESTMENT & BORROWING) & BULK IMPORT SPECIFICATION:
- Screens: TREPS Deal UI, Bulk Import UI ("Save Sample", "Accept"), Deal-wise Accounting.
- Key Validations:
  1. Row 5 / Row 6 Rule: Excel column headers MUST start at Row 5 and deal data at Row 6 (positional mapping applies even if header text differs).
  2. Save Sample: Generates template with proper headers and sample rows without any client-specific names/data.
  3. Mandatory & Date Checks: Trade No., Maturity Date, Settlement Date, Trade Interest Rate (%), Trade Value (Rs.) are mandatory; blank/invalid rows, duplicate Trade No., or dates beyond Server Date are rejected.
  4. Field Mapping & Math: 1 Leg Consideration (Principal) = Trade Value; Trade Interest Rate (%) = Repo Rate; Reversal Date for Lend = Maturity Date; system computes Tenure, Settlement Type, Total Interest, and 2-Leg Consideration (Principal + Interest).`);
  }

  if (q.includes('fd') || q.includes('fixed deposit') || q.includes('rollover') || q.includes('tds') || q.includes('lien')) {
    guides.push(`BEACON USER MANUAL 1.0 — FIXED DEPOSIT (FD) & TDS ACCOUNTING SPECIFICATION:
- Screens & Actions: FD Booking, Initiate Action -> FD Interest Receipt, FD Rollover, FD End (Maturity/Closure), Premature Closure, FD Lien Marking.
- Key Validations:
  1. FD End (Coupon vs Bullet): Computes final coupon or cumulative bullet interest, deducts statutory TDS, and posts balanced accounting entries (Debit Interest/Principal, Credit Bank Settlement, Credit TDS Payable GL).
  2. FD Rollover (Coupon vs Bullet): In Coupon mode, coupon is settled net of TDS and original principal rolls over; in Bullet mode, TDS is deducted from cumulative interest and Net Proceeds (Principal + Net Interest after TDS) roll over into the new FD deal.`);
  }

  if (q.includes('gl') || q.includes('accounting') || q.includes('ledger') || q.includes('voucher') || q.includes('gsec') || q.includes('g-sec') || q.includes('slr') || q.includes('lcr')) {
    guides.push(`BEACON USER MANUAL 1.0 — ACCOUNTING, GL MASTER & G-SEC PURPOSE SPECIFICATION:
- Screens: Global Accounting Code Master (GL Master), Deal-wise Accounting, Accounting Voucher Report.
- Key Validations:
  1. Editable GL Fields: Newly added GL Code fields in Global Accounting Code Master must be editable and visible in Deal-wise Accounting across all instruments (G-Sec by Purpose: SLR, LCR, Investment, Lien, Other; Bond/NCD; FD; CP; TREPS Investment; TREPS Borrowing).
  2. Old Branch Rule: Existing deals whose accounting entries were already generated and saved on an old branch must NOT generate duplicate or reversal entries.
  3. Effective Date & Undo Rule: Accounting entries reflect updated GL Codes based on the GL Master update date; performing Undo in GL Master removes the reverted GL Code from accounting.`);
  }

  if (q.includes('cashflow') || q.includes('cash flow') || q.includes('running balance') || q.includes('capitalized')) {
    guides.push(`BEACON USER MANUAL 1.0 — DAILY CASH FLOW MIS REPORT SPECIFICATION:
- Key Validations:
  1. Short Capitalized Interest Payment Flag: When checked, Running Balance accurately includes the applicable short capitalized interest payment amount.
  2. Capitalized Interest Payment Flag: When unchecked and interest payment is unprocessed, unprocessed interest is excluded from the summary and Running Balance is calculated strictly from actual processed transactions.`);
  }

  return guides.join('\n\n');
}


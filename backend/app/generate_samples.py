import os
import fitz  # PyMuPDF

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data")
os.makedirs(SAMPLE_DIR, exist_ok=True)

def generate_bank_statement_pdf():
    doc = fitz.open()
    page = doc.new_page(width=800, height=1050)
    
    # 1. Header & Logo
    page.draw_rect(fitz.Rect(50, 45, 170, 75), color=(0.05, 0.2, 0.55), fill=(0.05, 0.2, 0.55))
    page.insert_text((55, 67), "usbank.", fontsize=22, color=(1, 1, 1), fontname="helv")
    
    # Account Info
    page.insert_text((420, 50), "Account Number:    1234 5678 9012 3456", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    page.insert_text((420, 70), "Statement Period:    Mar 01, 2024 - Mar 31, 2024", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    page.insert_text((420, 90), "Page 1 of 3", fontsize=11, color=(0.3, 0.3, 0.3), fontname="helv")
    
    # Address
    page.insert_text((50, 110), "JOHN DOE", fontsize=12, color=(0.1, 0.1, 0.1), fontname="helv")
    page.insert_text((50, 128), "1234 MAPLE STREET", fontsize=11, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((50, 146), "SAN DIEGO, CA 92101", fontsize=11, color=(0.2, 0.2, 0.2), fontname="helv")
    
    # Contact Box
    page.draw_rect(fitz.Rect(460, 150, 680, 250), color=(0.7, 0.75, 0.85), width=1)
    page.insert_text((480, 172), "To Contact U.S. Bank", fontsize=12, color=(0.05, 0.2, 0.55), fontname="helv")
    page.insert_text((480, 195), "[Web]  usbank.com", fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((480, 215), "[Mobile]  Mobile Banking App", fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((480, 235), "[Phone]  800-USB-HELP (872-4357)", fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
    
    # Account Summary Section
    page.insert_text((50, 190), "ACCOUNT SUMMARY", fontsize=13, color=(0.05, 0.2, 0.55), fontname="helv")
    page.draw_line(fitz.Point(50, 198), fitz.Point(360, 198), color=(0.8, 0.8, 0.8), width=1)
    
    page.insert_text((50, 220), "Previous Balance", fontsize=11, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((260, 220), "$   6,591.12", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    
    page.insert_text((50, 245), "Total Deposits", fontsize=11, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((260, 245), "$  12,430.00", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    
    page.insert_text((50, 270), "Total Withdrawals", fontsize=11, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((260, 270), "$  13,856.73", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    
    page.draw_line(fitz.Point(50, 285), fitz.Point(360, 285), color=(0.8, 0.8, 0.8), width=1)
    page.insert_text((50, 305), "Current Balance", fontsize=12, color=(0.05, 0.2, 0.55), fontname="helv")
    # Tampered value with slightly mismatched font styling
    page.insert_text((260, 305), "$   5,164.39", fontsize=12, color=(0.9, 0.1, 0.1), fontname="helv")
    
    # Transaction History
    page.insert_text((50, 360), "TRANSACTION HISTORY", fontsize=13, color=(0.05, 0.2, 0.55), fontname="helv")
    page.draw_line(fitz.Point(50, 370), fitz.Point(740, 370), color=(0.2, 0.2, 0.2), width=1.5)
    
    # Table Header
    headers = [("Date", 50), ("Description", 130), ("Withdrawals", 410), ("Deposits", 530), ("Balance", 640)]
    for title, x in headers:
        page.insert_text((x, 385), title, fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
    page.draw_line(fitz.Point(50, 395), fitz.Point(740, 395), color=(0.7, 0.7, 0.7), width=1)
    
    rows = [
        ("Mar 01", "Opening Balance", "", "", "$ 6,591.12"),
        ("Mar 03", "ACH Deposit - Payroll", "", "$ 4,215.00", "$ 10,806.12"),
        ("Mar 05", "Amazon.com*6R2VJ1K80 Amzn.com/bill WA", "$ 89.99", "", "$ 10,716.13"),
        ("Mar 07", "Starbucks Store 12345 San Diego CA", "$ 5.75", "", "$ 10,710.38"),
        ("Mar 10", "Payment to ABC Supply Co. INV-0021", "$ 2,450.00", "", "$ 8,260.38"),
        ("Mar 10", "Payment to ABC Supply Co. INV-0021", "$ 2,450.00", "", "$ 5,810.38"),
        ("Mar 15", "Shell Oil 574873 San Diego CA", "$ 60.00", "", "$ 5,750.38"),
        ("Mar 20", "Check #1025", "$ 350.00", "", "$ 5,400.38"),
        ("Mar 25", "Interest Payment", "", "$ 1.23", "$ 5,401.61"),
        ("Mar 31", "Service Fee", "$ 37.22", "", "$ 5,364.39"),
    ]
    
    y = 420
    for r in rows:
        page.insert_text((50, y), r[0], fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
        page.insert_text((130, y), r[1], fontsize=10, color=(0.1, 0.1, 0.1), fontname="helv")
        if r[2]:
            page.insert_text((410, y), r[2], fontsize=10, color=(0.1, 0.1, 0.1), fontname="helv")
        if r[3]:
            page.insert_text((530, y), r[3], fontsize=10, color=(0.1, 0.1, 0.1), fontname="helv")
        page.insert_text((640, y), r[4], fontsize=10, color=(0.1, 0.1, 0.1), fontname="helv")
        y += 28
        
    page.draw_line(fitz.Point(50, y + 10), fitz.Point(740, y + 10), color=(0.2, 0.2, 0.2), width=1.5)
    page.insert_text((50, y + 35), "Ending Balance", fontsize=12, color=(0.05, 0.2, 0.55), fontname="helv")
    page.insert_text((640, y + 35), "$ 5,164.39", fontsize=12, color=(0.9, 0.1, 0.1), fontname="helv")
    
    # Metadata injection simulating Photoshop edit
    doc.set_metadata({
        "producer": "Adobe PDF Library 16.0 / Adobe Photoshop 2024",
        "creator": "Adobe Photoshop 25.4 (Windows)",
        "creationDate": "D:20240331182000Z",
        "modDate": "D:20240330101500Z" # Inconsistency: Mod before Creation
    })
    
    path = os.path.join(SAMPLE_DIR, "US_Bank_Statement_Mar2024.pdf")
    doc.save(path)
    doc.close()
    return path

def generate_invoice_pdf(filename: str, inv_num: str, amount: str, is_fabricated: bool = False):
    doc = fitz.open()
    page = doc.new_page(width=800, height=1050)
    page.insert_text((50, 70), "ABC SUPPLY CO.", fontsize=20, color=(0.1, 0.4, 0.7), fontname="helv")
    page.insert_text((50, 95), "100 Industrial Parkway, Suite 400", fontsize=10, color=(0.3, 0.3, 0.3), fontname="helv")
    page.insert_text((50, 110), "Chicago, IL 60601", fontsize=10, color=(0.3, 0.3, 0.3), fontname="helv")
    
    page.insert_text((500, 70), "INVOICE", fontsize=24, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((500, 95), f"Invoice #: {inv_num}", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    page.insert_text((500, 115), "Date: March 10, 2024", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    
    page.draw_rect(fitz.Rect(50, 150, 740, 180), color=(0.9, 0.92, 0.96), fill=(0.9, 0.92, 0.96))
    page.insert_text((60, 170), "Billed To: John Doe / Acme Logistics", fontsize=11, color=(0.2, 0.2, 0.2), fontname="helv")
    
    page.draw_rect(fitz.Rect(50, 210, 740, 235), color=(0.2, 0.2, 0.2), fill=(0.2, 0.2, 0.2))
    page.insert_text((60, 227), "Description", fontsize=11, color=(1, 1, 1), fontname="helv")
    page.insert_text((450, 227), "Qty", fontsize=11, color=(1, 1, 1), fontname="helv")
    page.insert_text((550, 227), "Rate", fontsize=11, color=(1, 1, 1), fontname="helv")
    page.insert_text((660, 227), "Amount", fontsize=11, color=(1, 1, 1), fontname="helv")
    
    page.insert_text((60, 265), "Commercial Building Materials & Hardware Batch #41", fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((455, 265), "1", fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((550, 265), amount, fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
    page.insert_text((660, 265), amount, fontsize=10, color=(0.2, 0.2, 0.2), fontname="helv")
    
    page.draw_line(fitz.Point(50, 310), fitz.Point(740, 310), color=(0.8, 0.8, 0.8), width=1)
    page.insert_text((550, 340), "Total Due:", fontsize=13, color=(0.1, 0.1, 0.1), fontname="helv")
    page.insert_text((660, 340), amount, fontsize=14, color=(0.1, 0.4, 0.7), fontname="helv")
    
    if is_fabricated:
        doc.set_metadata({"producer": "Canva PDF Generator", "creator": "Canva 2024"})
    else:
        doc.set_metadata({"producer": "QuickBooks Online PDF Engine", "creator": "Intuit ERP"})
        
    path = os.path.join(SAMPLE_DIR, filename)
    doc.save(path)
    doc.close()
    return path

def generate_other_samples():
    generate_invoice_pdf("invoice_1.pdf", "INV-0019", "$ 1,120.00")
    generate_invoice_pdf("invoice_2.pdf", "INV-0020", "$ 3,400.00")
    generate_invoice_pdf("invoice_3.pdf", "INV-0021", "$ 2,450.00", is_fabricated=True)
    
    # Paystub
    doc = fitz.open()
    p = doc.new_page(width=800, height=600)
    p.insert_text((50, 60), "EARNINGS STATEMENT / PAYSTUB", fontsize=16, color=(0.1, 0.1, 0.1), fontname="helv")
    p.insert_text((50, 85), "Employer: Pacific Tech Solutions Inc.", fontsize=11, color=(0.3, 0.3, 0.3), fontname="helv")
    p.insert_text((50, 105), "Employee: John Doe (ID #88392)", fontsize=11, color=(0.3, 0.3, 0.3), fontname="helv")
    p.insert_text((500, 85), "Pay Period: Mar 01 - Mar 15, 2024", fontsize=10, color=(0.3, 0.3, 0.3), fontname="helv")
    p.insert_text((500, 105), "Net Pay: $ 4,215.00", fontsize=13, color=(0.1, 0.5, 0.2), fontname="helv")
    doc.set_metadata({"producer": "ADP Payroll Services", "creator": "ADP Vantage"})
    doc.save(os.path.join(SAMPLE_DIR, "Paystub_Mar2024.pdf"))
    doc.close()

    # Tax Return
    doc2 = fitz.open()
    p2 = doc2.new_page(width=800, height=1050)
    p2.insert_text((50, 60), "Form 1040 - U.S. Individual Income Tax Return (2023)", fontsize=14, color=(0.1, 0.1, 0.1), fontname="helv")
    p2.insert_text((50, 90), "Filing Status: Single | Taxpayer: John Doe | SSN: ***-**-6789", fontsize=10, color=(0.3, 0.3, 0.3), fontname="helv")
    doc2.set_metadata({"producer": "Intuit TurboTax 2023", "creator": "TurboTax Tax Engine"})
    doc2.save(os.path.join(SAMPLE_DIR, "Tax_Return_2023.pdf"))
    doc2.close()

    # ID Proof
    doc3 = fitz.open()
    p3 = doc3.new_page(width=700, height=450)
    p3.draw_rect(fitz.Rect(40, 40, 660, 410), color=(0.1, 0.3, 0.6), fill=(0.95, 0.97, 1.0), width=2)
    p3.insert_text((60, 75), "STATE DRIVER LICENSE", fontsize=16, color=(0.1, 0.3, 0.6), fontname="helv")
    p3.insert_text((60, 110), "DL: D93847291  |  EXP: 08/24/2028", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    p3.insert_text((60, 135), "NAME: JOHN DOE", fontsize=12, color=(0.1, 0.1, 0.1), fontname="helv")
    p3.insert_text((60, 160), "DOB: 05/14/1988  |  SEX: M", fontsize=11, color=(0.1, 0.1, 0.1), fontname="helv")
    p3.draw_rect(fitz.Rect(480, 80, 620, 240), color=(0.5, 0.5, 0.5), fill=(0.85, 0.88, 0.92))
    p3.insert_text((515, 165), "[PHOTO]", fontsize=12, color=(0.4, 0.4, 0.4), fontname="helv")
    doc3.set_metadata({"producer": "State DMV Secure Card Issuance", "creator": "IDEMIA Secure Card System"})
    doc3.save(os.path.join(SAMPLE_DIR, "ID_Proof.pdf"))
    doc3.close()

if __name__ == "__main__":
    generate_bank_statement_pdf()
    generate_other_samples()
    print("All sample PDF files generated in", SAMPLE_DIR)

import frappe
from frappe.utils import flt

def cal_igst(self, method):
	# for Overseas or SEZ
	# if self.gst_category == "Overseas" or self.gst_category == "SEZ":
	# 	igst_acc = frappe.db.get_value('GST Account', {'parent': 'GST Settings', 'company': self.company, 'account_type': "Output"}, ['igst_account'])
	# 	if igst_acc:
	# 		if not self.taxes:
	# 			zero_igst(self)
	# 		else:
	# 			for tax in self.taxes:
	# 				if tax.account_head == igst_acc:
	# 					item_wise_tax_detail = tax.item_wise_tax_detail
						
	# 					# Check if item_wise_tax_detail is a string and convert it to a dictionary
	# 					if isinstance(item_wise_tax_detail, str):
	# 						item_wise_tax_detail = frappe.parse_json(item_wise_tax_detail)
						
	# 					for item, tax_detail in item_wise_tax_detail.items():
	# 						igst_rate, igst_amount = tax_detail
	# 						update_sales_invoice_item(self, item, igst_rate, igst_amount)
	# 				else:
	# 					zero_igst(self)
    if self.gst_category not in ("Overseas", "SEZ"):
        return

    igst_account = frappe.db.get_value(
        "GST Account",
        {
            "parent": "GST Settings",
            "company": self.company,
            "account_type": "Output",
        },
        "igst_account",
    )
    if not igst_account:
        return

    igst_tax_row = next(
        (tax for tax in self.taxes if tax.account_head == igst_account),
        None,
    )

    item_tax_details = {}
    if igst_tax_row:
        item_tax_details = igst_tax_row.item_wise_tax_detail
        if isinstance(item_tax_details, str):
            item_tax_details = frappe.parse_json(item_tax_details)
        item_tax_details = item_tax_details or {}

    for row in self.items:
        tax_detail = item_tax_details.get(row.item_code)
        row.igst_rate = flt(tax_detail[0]) if tax_detail else 0
        row.igst_amount = flt(
            flt(row.taxable_value) * row.igst_rate / 100,
            row.precision("igst_amount"),
        )

def update_sales_invoice_item(self, item_code, igst_rate, igst_amount):
	# Find the Sales Invoice Item corresponding to the item_code
	for item in self.items:
		if item.item_code == item_code:
			# Set the IGST Rate and IGST Amount
			item.igst_rate = igst_rate
			item.igst_amount = igst_amount
			break

def zero_igst(self):
	for item in self.items:
		item.igst_rate = 0
		item.igst_amount = 0
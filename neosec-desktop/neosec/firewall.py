from PySide6.QtCore import QAbstractListModel, Qt, QModelIndex, Slot, Signal, Property

class Firewall(QAbstractListModel):
    saveRulesRequested = Signal(list)
    dirtyChanged = Signal()

    def __init__(self, rules = None):
        super().__init__()
        self._headers = ["ip_address", "port_start", "port_end", "protocol", "rule_action", "rule_enabled"]
        self._rules = rules or []
        self._displayed_rules = list(self._rules)
        self._roles = {Qt.UserRole + i: header.encode() for i, header in enumerate(self._headers)}
        self._is_dirty = False
        self._filter_text = ""
        self._filter_type = "ALL" # ALL, ENABLED, DISABLED

    def roleNames(self):
        return self._roles

    def rowCount(self, parent=QModelIndex()):
        return len(self._displayed_rules)

    @Property(bool, notify=dirtyChanged)
    def isDirty(self):
        return self._is_dirty

    @Property(int, notify=dirtyChanged)
    def activeRuleCount(self):
        return len([r for r in self._rules if r.get("rule_enabled")])

    def data(self, index, role):
        if not index.isValid():
            return None
        
        row = index.row()
        if 0 <= row < len(self._displayed_rules):
            role_name = self._roles.get(role).decode()
            return self._displayed_rules[row].get(role_name)
        return None

    @Slot(list)
    def update_rules(self, new_rules):
        self.beginResetModel()
        self._rules = new_rules
        self._apply_filters()
        self._is_dirty = False 
        self.endResetModel()
        self.dirtyChanged.emit()

    def _apply_filters(self):
        # Start with all rules
        temp = self._rules
        
        # Filter by status
        if self._filter_type == "ENABLED":
            temp = [r for r in temp if r.get("rule_enabled")]
        elif self._filter_type == "DISABLED":
            temp = [r for r in temp if not r.get("rule_enabled")]
            
        # Filter by text (IP or Port)
        if self._filter_text:
            query = self._filter_text.lower()
            temp = [
                r for r in temp 
                if query in str(r.get("ip_address", "")).lower() 
                or query in str(r.get("port_start", "")) 
                or query in str(r.get("port_end", ""))
            ]
            
        self._displayed_rules = temp

    @Slot(int)
    def toggle_selection(self, row):
        if 0 <= row < len(self._displayed_rules):
            rule = self._displayed_rules[row]
            # Since dictionaries are mutable and shared, this updates the master list too
            rule["rule_enabled"] = not rule["rule_enabled"]
            
            # Check if we should re-filter (e.g. if we are in a filtered view)
            should_refilter = False
            if self._filter_type != "ALL":
                # If we toggled, it no longer matches the current singular status filter
                should_refilter = True
                
            if should_refilter:
                self.beginResetModel()
                self._apply_filters()
                self.endResetModel()
            else:
                role_id = Qt.UserRole + self._headers.index("rule_enabled")
                self.dataChanged.emit(self.index(row), self.index(row), [role_id])
            
            if not self._is_dirty:
                self._is_dirty = True
                self.dirtyChanged.emit()

    @Slot(str)
    def set_filter_text(self, text):
        if self._filter_text != text:
            self._filter_text = text
            self.beginResetModel()
            self._apply_filters()
            self.endResetModel()

    @Slot(str)
    def set_filter_type(self, filter_type):
        if self._filter_type != filter_type:
            self._filter_type = filter_type
            self.beginResetModel()
            self._apply_filters()
            self.endResetModel()

    @Slot()
    def save_all(self):
        enabled_count = len([rule for rule in self._rules if rule.get("rule_enabled")])
        self.saveRulesRequested.emit(self._rules)
        
        self._is_dirty = False
        self.dirtyChanged.emit()

-- Bioremediation's subcontract orders are now called sub-contracts, so they
-- aren't mistaken for the client's work order they belong to.
UPDATE `contract_orders` SET `type` = 'sub_contract' WHERE `type` = 'work_order';
